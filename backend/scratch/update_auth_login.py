import sys

file_path = "app/api/v1/auth.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if "# 1. Find user by email and domain-scope" in line:
        start_index = i
    if 'raise UnauthorizedException("Incorrect email or password")' in line and i > 260 and i < 280:
        end_index = i
        break

if start_index != -1 and end_index != -1:
    new_logic = [
        '    # 1. Find user by email (Global lookup first to differentiate errors)\n',
        '    stmt = select(User).where(User.email == form_data.username).options(\n',
        '        selectinload(User.admin_profile),\n',
        '        selectinload(User.agent_profile).selectinload(Agent.smtp_settings),\n',
        '        selectinload(User.customer_profile).selectinload(Customer.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings),\n',
        '        selectinload(User.sub_user_profile).options(\n',
        '            selectinload(SubUser.permissions),\n',
        '            selectinload(SubUser.agent).selectinload(User.agent_profile).selectinload(Agent.smtp_settings)\n',
        '        ),\n',
        '        selectinload(User.subscription)\n',
        '    )\n',
        '    result = await db.execute(stmt)\n',
        '    user = result.scalar_one_or_none()\n',
        '    \n',
        '    # 2. Check if user exists anywhere\n',
        '    if not user:\n',
        '        raise UnauthorizedException("Incorrect email or password")\n',
        '    \n',
        '    # 3. Domain scoping check\n',
        '    if agent_id:\n',
        '        # On a specific agent domain, user must belong to that agent OR be an admin\n',
        '        if user.agent_id != agent_id and user.role != UserRole.ADMIN:\n',
        '            raise UnauthorizedException("This email is not registered")\n',
        '    \n',
        '    # 4. Authentication (Password) check\n',
        '    if not verify_password(form_data.password, user.password_hash):\n',
        '        raise UnauthorizedException("Incorrect email or password")\n'
    ]
    
    lines[start_index:end_index+1] = new_logic
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Successfully updated auth.py")
else:
    print(f"Could not find indices: {start_index} to {end_index}")
    # Print some lines for debugging
    if start_index != -1:
        print(f"Start found at {start_index}: {lines[start_index]}")
