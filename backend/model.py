import torch
import torch.nn as nn
from transformers import T5EncoderModel

class CrystalModel(nn.Module):
    def __init__(self, vocab_size):
        super().__init__()

        # T5-Small encoder
        self.encoder = T5EncoderModel.from_pretrained('t5-small')
        self.encoder.resize_token_embeddings(vocab_size)

        # Shared MLP — ORIGINAL architecture (matches your saved model)
        self.shared = nn.Sequential(
            nn.Linear(512, 256),   # ← was 512→512 in new code
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),   # ← was 512→256 in new code
            nn.GELU(),
            nn.Dropout(0.1)
            # ← no third layer unlike new code
        )

        # 5 regression heads (matches your saved model)
        self.reg_heads = nn.ModuleList([
            nn.Linear(128, 1) for _ in range(5)
        ])

        # 1 classification head
        self.cls_head = nn.Linear(128, 2)

    def forward(self, input_ids, attention_mask):
        out = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask
        ).last_hidden_state

        mask   = attention_mask.unsqueeze(-1).float()
        pooled = (out * mask).sum(dim=1) / mask.sum(dim=1)

        shared = self.shared(pooled)

        reg_out = torch.cat(
            [head(shared) for head in self.reg_heads],
            dim=-1
        )
        cls_out = self.cls_head(shared)

        return reg_out, cls_out