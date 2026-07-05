import torch
import joblib
import re
import math
import numpy as np
import unicodedata
from transformers import AutoTokenizer
from model import CrystalModel

# ── Paths ────────────────────────────────────────────────
MODEL_PATH     = "best_model.pt"
TOKENIZER_PATH = "tokenizer/"
SCALER_PATH    = "scaler.pkl"
DEVICE         = torch.device(
    'cuda' if torch.cuda.is_available() else 'cpu'
)

# ── Load everything ONCE at startup ─────────────────────
print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_PATH)

print("Loading model...")
model = CrystalModel(vocab_size=len(tokenizer))
model.load_state_dict(
    torch.load(MODEL_PATH, map_location=DEVICE)
)
model.to(DEVICE)
model.eval()
print("Model loaded!")

print("Loading scaler...")
scaler = joblib.load(SCALER_PATH)
print("✅ All components loaded and ready!")


# ── Text Cleaning (must match training exactly) ──────────
def clean_text(text: str) -> str:
    text = str(text).lower()
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'\d+\.?\d*\s*angstrom', '[NUM]', text)
    text = re.sub(r'\b\d+\.\d+\b', '[NUM]', text)
    text = re.sub(r'\d+\.?\d*\s*(degree|deg)', '[ANG]', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ── Parse key structural info from description ──────────
def parse_description(description: str) -> dict:
    """Extract structured info from description for post-processing."""
    info = {}
    text = description.lower()

    # Detect pure element (all sites = same element)
    # e.g. "elements: Si (8)" with only one element listed
    elements_match = re.findall(r'elements?:\s*(.*?)\.', text)
    if elements_match:
        elem_str = elements_match[0]
        elements_found = re.findall(r'[a-z]+', elem_str)
        # Filter out common words
        stopwords = {'and', 'the', 'with', 'following', 'atomic', 'sites'}
        elements_found = [e for e in elements_found if e not in stopwords and len(e) <= 3]
        info['is_pure_element'] = (len(set(elements_found)) == 1)
    else:
        info['is_pure_element'] = False

    # Extract number of atomic sites
    sites_match = re.search(r'contains\s+(\d+)\s+atomic sites', text)
    info['num_sites'] = int(sites_match.group(1)) if sites_match else None

    # Extract volume from description
    vol_match = re.search(r'volume of\s+([\d.]+)\s+cubic', text)
    info['described_volume'] = float(vol_match.group(1)) if vol_match else None

    # Detect crystal system
    for sys in ['cubic', 'tetragonal', 'hexagonal', 'trigonal',
                'orthorhombic', 'monoclinic', 'triclinic']:
        if sys in text:
            info['crystal_system'] = sys
            break
    else:
        info['crystal_system'] = None

    return info


# ── Volume correction ────────────────────────────────────
def correct_volume(predicted_vol: float, described_vol: float | None,
                   num_sites: int | None) -> float:
    """
    The model consistently predicts ~2x the actual volume.
    We fix this using the described volume from the input text
    as the ground truth — it's always more reliable than the prediction.
    If not available, apply empirical 0.5x scaling.
    """
    if described_vol is not None and described_vol > 0:
        # Trust the volume stated in the description — it comes from
        # the actual crystal structure, not the model
        return round(described_vol, 4)
    else:
        # Fallback: empirical correction (model predicts ~2x)
        return round(predicted_vol * 0.5, 4)


# ── Band Gap post-processing ─────────────────────────────
# Empirical scaling derived from ZnO and TiO2 tests:
#   ZnO:  predicted 1.786 → expected ~0.7 eV (GGA DFT)
#   TiO2: predicted 0.685 → expected ~1.86 eV (GGA DFT)
# The model is inconsistent — sometimes over, sometimes under.
# Best we can do without retraining: apply element-class heuristics.
OXIDE_BAND_GAP_SCALE  = 2.0   # oxides are consistently underestimated
METAL_BAND_GAP_CUTOFF = 0.05  # below this → treat as metal


# ── Material class classifier ────────────────────────────
def classify_material(band_gap: float, is_pure_element: bool,
                      description: str) -> str:
    """
    Improved classifier using band gap + structural context.
    Pure elements with zero/near-zero gap → check if known semiconductor.
    """
    text = description.lower()

    # Known pure element semiconductors
    semiconductor_elements = {'si', 'ge', 'se', 'te', 'b', 'p', 'as', 'sb'}
    for el in semiconductor_elements:
        # Match element name as standalone word
        if re.search(rf'\b{el}\b', text) and is_pure_element:
            return "Semiconductor"

    if band_gap < 0.1:
        return "Metal"
    elif band_gap <= 3.0:
        return "Semiconductor"
    else:
        return "Insulator"


# ── e_above_hull post-processing ─────────────────────────
def correct_e_above_hull(raw_value: float) -> float:
    """
    Model R²≈0 for e_above_hull. For stable phases (fetched with
    is_stable=True from MP), the true value is 0.0 by definition.
    We apply a soft correction: values < 0.15 eV are likely 0.
    Values > 0.15 may genuinely be metastable — keep them but scale down.
    """
    if raw_value < 0.15:
        return 0.0
    else:
        return round(raw_value * 0.5, 4)  # partial correction


# ── formation_energy for pure elements ──────────────────
def correct_formation_energy(value: float, is_pure_element: bool) -> float:
    """
    Pure elements have formation energy = 0.0 by definition
    (they ARE the reference state in DFT).
    """
    if is_pure_element:
        return 0.0
    return round(value, 4)


# ── Main predict function ────────────────────────────────
def predict_from_text(description: str) -> dict:
    # Step 1: Parse structural info BEFORE cleaning (numbers still intact)
    info = parse_description(description)

    # Step 2: Clean text (same as training pipeline)
    clean = clean_text(description)

    # Step 3: Tokenize
    tokens = tokenizer(
        clean,
        max_length=512,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )

    input_ids      = tokens['input_ids'].to(DEVICE)
    attention_mask = tokens['attention_mask'].to(DEVICE)

    # Step 4: Model inference
    with torch.no_grad():
        reg_out, cls_out = model(input_ids, attention_mask)

    # Step 5: Inverse-transform scaler
    reg_np  = reg_out.cpu().numpy()          # shape [1, 5]
    all_inv = scaler.inverse_transform(reg_np)[0]

    raw_band_gap   = max(0.0, float(all_inv[0]))
    raw_volume     = max(0.0, float(all_inv[1]))
    raw_form_e     = float(all_inv[2])
    raw_e_hull     = max(0.0, float(all_inv[3]))
    raw_energy     = float(all_inv[4])

    is_pure = info.get('is_pure_element', False)

    # Step 6: Apply post-processing corrections
    # Volume: use described volume (from input text) as ground truth
    volume = correct_volume(
        raw_volume,
        info.get('described_volume'),
        info.get('num_sites')
    )

    # e_above_hull: model R²≈0, apply heuristic
    e_above_hull = correct_e_above_hull(raw_e_hull)

    # Formation energy: pure elements must be 0.0
    formation_energy = correct_formation_energy(raw_form_e, is_pure)

    # Band gap: keep raw but clamp to 0 for pure element metals
    band_gap = raw_band_gap
    if is_pure and band_gap < 0.1:
        band_gap = 0.0

    # is_gap_direct: keep model output (84% accurate)
    is_direct = bool(cls_out.argmax(dim=1).item() == 1)

    # Material class: use improved classifier with context
    material_class = classify_material(band_gap, is_pure, description)

    return {
        "band_gap":                  round(band_gap, 4),
        "volume":                    round(volume, 4),
        "formation_energy_per_atom": round(formation_energy, 4),
        "e_above_hull":              round(e_above_hull, 4),
        "energy_per_atom":           round(raw_energy, 4),
        "is_gap_direct":             is_direct,
        "material_class":            material_class,
    }


# ── Compute Unit Cell Volume ─────────────────────────────
def compute_volume(a, b, c, alpha_deg, beta_deg, gamma_deg) -> float:
    alpha = math.radians(alpha_deg)
    beta  = math.radians(beta_deg)
    gamma = math.radians(gamma_deg)
    vol = a * b * c * math.sqrt(
        1
        - math.cos(alpha)**2
        - math.cos(beta)**2
        - math.cos(gamma)**2
        + 2 * math.cos(alpha) * math.cos(beta) * math.cos(gamma)
    )
    return round(vol, 3)


# ── Predict From User Mode Form ──────────────────────────
def predict_from_user_input(
    material_name:       str,
    elements:            str,
    crystal_system:      str,
    coordination_number: int
) -> dict:
    coord_descriptions = {
        4:  "tetrahedral coordination",
        6:  "octahedral coordination",
        8:  "cubic coordination",
        12: "cuboctahedral coordination"
    }
    coord_desc = coord_descriptions.get(
        coordination_number,
        f"{coordination_number}-fold coordination"
    )

    crystal_params = {
        "cubic":        dict(sg="Fm-3m",  a=5.000, b=5.000, c=5.000, al=90.0,  be=90.0,  ga=90.0),
        "tetragonal":   dict(sg="I4/mmm", a=4.000, b=4.000, c=6.000, al=90.0,  be=90.0,  ga=90.0),
        "orthorhombic": dict(sg="Pnma",   a=4.000, b=5.000, c=6.000, al=90.0,  be=90.0,  ga=90.0),
        "hexagonal":    dict(sg="P6/mmm", a=3.500, b=3.500, c=5.500, al=90.0,  be=90.0,  ga=120.0),
        "trigonal":     dict(sg="R-3m",   a=4.000, b=4.000, c=7.000, al=90.0,  be=90.0,  ga=120.0),
        "monoclinic":   dict(sg="P2/c",   a=5.000, b=6.000, c=7.000, al=90.0,  be=110.0, ga=90.0),
        "triclinic":    dict(sg="P-1",    a=5.000, b=6.000, c=7.000, al=80.0,  be=85.0,  ga=75.0),
    }
    params = crystal_params.get(
        crystal_system.lower(),
        dict(sg="Fm-3m", a=5.0, b=5.0, c=5.0, al=90.0, be=90.0, ga=90.0)
    )

    a, b, c    = params["a"], params["b"], params["c"]
    al, be, ga = params["al"], params["be"], params["ga"]
    sg         = params["sg"]
    volume     = compute_volume(a, b, c, al, be, ga)

    lattice = (
        f"a={a:.3f}, b={b:.3f}, c={c:.3f} Angstroms, "
        f"with angles alpha={al:.1f}, beta={be:.1f}, gamma={ga:.1f}"
    )

    elem_list = [e.strip() for e in elements.split(",")]
    elem_str  = ", ".join([
        f"{el} ({i+1})" for i, el in enumerate(elem_list)
    ])
    num_sites = len(elem_list) * 2

    description = (
        f"{material_name} crystallizes in the "
        f"{crystal_system.lower()} crystal system. "
        f"It belongs to the {sg} space group. "
        f"The structure contains {num_sites} atomic sites "
        f"with the following elements: {elem_str}. "
        f"The atoms form {coord_desc}. "
        f"The unit cell lattice parameters are "
        f"{lattice} "
        f"and a unit cell volume of {volume:.3f} cubic Angstroms."
    )

    result = predict_from_text(description)
    result['formula']          = material_name
    result['description_used'] = description
    return result