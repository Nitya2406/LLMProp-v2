import os
from groq import Groq
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from predict import predict_from_text, predict_from_user_input

# ── Load environment variables ───────────────────────────
load_dotenv()

# ── App Setup ────────────────────────────────────────────
app = FastAPI(
    title       = "Crystal Property Prediction API",
    description = "Predicts crystal properties from text or user form inputs",
    version     = "1.2.0"
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"]
)


# ── Request Models ───────────────────────────────────────
class TextRequest(BaseModel):
    description: str

class UserModeRequest(BaseModel):
    material_name:       str
    elements:            str
    crystal_system:      str
    coordination_number: int

class ChatMessage(BaseModel):
    role:    str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict]        = None
    history: Optional[List[ChatMessage]] = []   # ← NEW: full conversation history


# ── Response Models ──────────────────────────────────────
class PredictionResponse(BaseModel):
    band_gap:                  float
    volume:                    float
    formation_energy_per_atom: float
    e_above_hull:              float
    energy_per_atom:           float
    is_gap_direct:             bool
    material_class:            str
    formula:                   Optional[str] = None
    description_used:          Optional[str] = None

class ChatResponse(BaseModel):
    reply: str


# ── Routes ───────────────────────────────────────────────

@app.get("/")
def home():
    return {
        "message": "Crystal Property Prediction API ✅",
        "version": "1.2.0",
        "endpoints": {
            "POST /predict/text": "Researcher mode — natural language crystal description",
            "POST /predict/user": "User mode — simple form inputs",
            "POST /chat":         "AI Assistant chat (requires GROQ_API_KEY)",
            "GET  /health":       "Health check",
            "GET  /docs":         "Interactive API documentation"
        }
    }


@app.get("/health")
def health():
    return {"status": "ok", "model": "loaded"}


# ── Route 1: Researcher Mode ─────────────────────────────
@app.post("/predict/text", response_model=PredictionResponse)
def predict_text(request: TextRequest):
    if not request.description.strip():
        raise HTTPException(
            status_code=400,
            detail="Description cannot be empty"
        )
    if len(request.description) < 20:
        raise HTTPException(
            status_code=400,
            detail="Description too short — provide a full crystal description"
        )
    try:
        result = predict_from_text(request.description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 2: User Mode ───────────────────────────────────
@app.post("/predict/user", response_model=PredictionResponse)
def predict_user(request: UserModeRequest):
    if not request.material_name.strip():
        raise HTTPException(status_code=400, detail="Material name cannot be empty")
    if not request.elements.strip():
        raise HTTPException(status_code=400, detail="Elements cannot be empty")
    if not request.crystal_system.strip():
        raise HTTPException(status_code=400, detail="Crystal system cannot be empty")
    if request.coordination_number < 1 or request.coordination_number > 12:
        raise HTTPException(
            status_code=400,
            detail="Coordination number must be between 1 and 12"
        )
    valid_systems = {"cubic","tetragonal","orthorhombic","hexagonal","trigonal","monoclinic","triclinic"}
    if request.crystal_system.lower() not in valid_systems:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid crystal system. Must be one of: {', '.join(sorted(valid_systems))}"
        )
    try:
        result = predict_from_user_input(
            material_name       = request.material_name,
            elements            = request.elements,
            crystal_system      = request.crystal_system,
            coordination_number = request.coordination_number
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helper: interpret property values for the prompt ────
def interpret_properties(ctx: dict) -> str:
    """Generate human-readable interpretations of each predicted property."""
    lines = []

    # Band gap interpretation
    bg = ctx.get('band_gap', 0)
    if bg < 0.1:
        bg_interp = "zero/near-zero → metallic conductor, no band gap"
    elif bg < 1.5:
        bg_interp = f"small gap → narrow-gap semiconductor, good for infrared or thermoelectric devices"
    elif bg < 3.0:
        bg_interp = f"medium gap → semiconductor, suitable for solar cells, transistors, LEDs"
    else:
        bg_interp = f"large gap → wide-bandgap semiconductor or insulator, suited for UV optics or high-power electronics"
    lines.append(f"Band Gap: {bg} eV ({bg_interp})")

    # Formation energy interpretation
    fe = ctx.get('formation_energy_per_atom', 0)
    if fe == 0:
        fe_interp = "pure element reference state (formation energy = 0 by definition)"
    elif fe < -2.0:
        fe_interp = "strongly exothermic → highly stable compound, difficult to decompose"
    elif fe < -0.5:
        fe_interp = "moderately stable compound"
    else:
        fe_interp = "weakly stable or metastable compound"
    lines.append(f"Formation Energy: {fe} eV/atom ({fe_interp})")

    # E above hull interpretation
    eh = ctx.get('e_above_hull', 0)
    if eh == 0:
        eh_interp = "ground state phase — thermodynamically most stable polymorph"
    elif eh < 0.05:
        eh_interp = "nearly stable, may be synthesizable under mild conditions"
    elif eh < 0.1:
        eh_interp = "metastable, possibly synthesizable under special conditions"
    else:
        eh_interp = "unstable phase, unlikely to be synthesizable"
    lines.append(f"E Above Hull: {eh} eV/atom ({eh_interp})")

    # Volume interpretation
    vol = ctx.get('volume', 0)
    lines.append(f"Unit Cell Volume: {vol} Å³ (size of the repeating crystal unit cell)")

    # Energy per atom
    epa = ctx.get('energy_per_atom', 0)
    lines.append(f"Energy Per Atom: {epa} eV (total DFT ground state energy per atom)")

    # Band type
    is_direct = ctx.get('is_gap_direct', False)
    band_type = "direct gap → efficient light emission, good for LEDs/lasers" if is_direct \
                else "indirect gap → less efficient light emission, better for electronics/solar"
    lines.append(f"Band Type: {'Direct' if is_direct else 'Indirect'} ({band_type})")

    # Material class
    mc = ctx.get('material_class', 'Unknown')
    lines.append(f"Material Class: {mc}")

    return "\n".join(lines)


# ── Route 3: AI Assistant Chat (Groq) ───────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY not configured. Set it in .env file."
        )
    try:
        client  = Groq(api_key=api_key)
        context = request.context or {}
        history = request.history or []

        mat_name    = context.get('material_name', 'the material')
        mat_class   = context.get('material_class', 'Unknown')
        band_gap    = context.get('band_gap', 'N/A')
        volume      = context.get('volume', 'N/A')
        form_e      = context.get('formation_energy_per_atom', 'N/A')
        e_hull      = context.get('e_above_hull', 'N/A')
        energy_atom = context.get('energy_per_atom', 'N/A')
        is_direct   = context.get('is_gap_direct', False)
        band_type   = "Direct" if is_direct else "Indirect"

        # Build rich interpretations
        interpretations = interpret_properties(context)

        system_prompt = f"""You are an expert AI Materials Science Assistant integrated into an LLM-Prop crystal property prediction tool.

The tool uses a fine-tuned T5-Small language model trained on 80,000 crystal structures from the Materials Project database. It predicts 6 properties from crystal structure text descriptions: band gap, volume, formation energy per atom, energy above hull, energy per atom, and whether the band gap is direct or indirect.

The user has just run a prediction and received these results for: {mat_name}

═══════════════════════════════════════
PREDICTED PROPERTIES WITH INTERPRETATIONS
═══════════════════════════════════════
{interpretations}

═══════════════════════════════════════
ABOUT THIS MODEL
═══════════════════════════════════════
- Model: T5-Small encoder + custom MLP regression/classification heads
- Training data: 80,000 stable crystal structures from Materials Project (DFT-computed values)
- Training: 2-phase (frozen encoder → full fine-tuning)
- Known limitation: Band gap predictions use GGA DFT targets which underestimate experimental values by ~30-50%
- Volume, formation energy, e_above_hull, and energy_per_atom are generally reliable
- is_gap_direct classification accuracy: ~84%

═══════════════════════════════════════
YOUR BEHAVIOUR
═══════════════════════════════════════
- Answer SPECIFICALLY about {mat_name} and its predicted values above
- When asked about a property, quote the actual predicted number and explain what it means physically
- When asked about applications, base your answer on the specific band gap ({band_gap} eV), material class ({mat_class}), and stability (e_above_hull={e_hull} eV)
- When asked about the model or predictions, explain how LLM-Prop works
- When asked about stability, use formation energy AND e_above_hull together
- When asked about band gap accuracy, acknowledge the GGA underestimation limitation honestly
- Give concrete, specific answers — never vague or generic
- Keep answers to 3-5 sentences unless a detailed explanation is requested
- Use simple language for students but be technically precise for researchers
- If asked something completely unrelated to materials science, politely redirect"""

        # Build message list with full conversation history
        messages = [{"role": "system", "content": system_prompt}]

        # Add previous conversation turns
        for turn in history[-6:]:   # keep last 6 turns to avoid token overflow
            messages.append({
                "role":    turn.role,
                "content": turn.content
            })

        # Add current user message
        messages.append({"role": "user", "content": request.message})

        response = client.chat.completions.create(
            model       = "llama-3.1-8b-instant",   # faster and better than llama3-8b-8192
            messages    = messages,
            max_tokens  = 600,
            temperature = 0.4    # lower = more focused and factual
        )

        return {"reply": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI chat error: {str(e)}"
        )