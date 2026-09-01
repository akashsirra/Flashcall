with open('.env.development.local', 'r') as f:
    lines = f.readlines()

cleaned = [l for l in lines if not l.startswith('VAPID_')]

with open('.env.development.local', 'w') as f:
    f.writelines(cleaned)

print(f"Kept {len(cleaned)} of {len(lines)} lines")
