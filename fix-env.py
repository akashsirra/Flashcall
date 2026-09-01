with open('.env.development.local', 'r') as f:
    lines = f.readlines()

def is_valid(line):
    stripped = line.strip()
    if not stripped:
        return False
    first_token = stripped.split()[0] if stripped.split() else ''
    return '=' in first_token

cleaned = [l for l in lines if is_valid(l)]

with open('.env.development.local', 'w') as f:
    f.writelines(cleaned)

print(f"Kept {len(cleaned)} of {len(lines)} lines")
