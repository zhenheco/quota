# Demo brand assets

These are **placeholder** images so the demo and `seed-brand` flow work out of the box:

- `logo.png` — placeholder company logo
- `stamp.png` — placeholder quote seal
- `bank.jpg` — placeholder bank/remittance image

They are intentionally generic. Replace them with your own brand assets:

```bash
QUOTA_API_URL=https://your-quota.example.workers.dev \
QUOTA_API_TOKEN=your-token \
pnpm seed-brand --logo ./path/to/your-logo.png \
                --stamp ./path/to/your-stamp.png \
                --bank ./path/to/your-bank.jpg
```

…or upload them in `/settings` after deploying.
