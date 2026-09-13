from pathlib import Path

upgrade = Path('tools/upgrade_outbreak_routes.py')
lines = upgrade.read_text(encoding='utf-8').splitlines()
for i, line in enumerate(lines):
    if line.startswith('needle = "const P1={'):
        lines[i] = 'needle = "const P1={\\n\'확산\':[\\n"'
        if i + 1 < len(lines) and lines[i + 1] == '"':
            lines.pop(i + 1)
        break
else:
    raise RuntimeError('broken needle line not found')
upgrade.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('upgrade script repaired')
