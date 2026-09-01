import re
import getpass

password = getpass.getpass("Paste new Neon password (hidden): ")
host_part = "ep-small-pine-auwpkpr4-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
new_url = f"postgresql://neondb_owner:{password}@{host_part}"

with open('.env.development.local', 'r') as f:
    content = f.read()

content = re.sub(r'^DATABASE_URL=.*$', f'DATABASE_URL="{new_url}"', content, flags=re.MULTILINE)

with open('.env.development.local', 'w') as f:
    f.write(content)

print("Updated DATABASE_URL (password not printed)")
