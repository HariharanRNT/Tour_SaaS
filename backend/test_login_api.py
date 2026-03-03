import requests
import json
import os
import time

def test_full_login_flow():
    # Step 1: Trigger login to get OTP
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "username": "agent1@toursaas.com",
        "password": "Password@123"
    }
    
    print("Initiating login...")
    response = requests.post(login_url, data=login_data)
    
    if response.status_code != 200:
        print(f"Login Step Failed: {response.text}")
        return
        
    print("Login initiated successfully.")
    
    # Wait a moment for file I/O
    time.sleep(1)
    
    # Step 2: Extract OTP from log file
    otp = None
    log_file_path = "otp_log.txt"
    try:
        with open(log_file_path, "r") as f:
            lines = f.readlines()
            for i in range(len(lines)-1, -1, -1):
                if "Email: agent1@toursaas.com" in lines[i]:
                    otp_line = lines[i+1]
                    otp = otp_line.split("OTP:")[1].strip()
                    break
    except Exception as e:
        print(f"Error reading OTP log: {e}")
        return
        
    if not otp:
        print("Could not find OTP in log file.")
        return
        
    print(f"Extracted OTP: {otp}")
    
    # Step 3: Verify OTP
    verify_url = "http://localhost:8000/api/v1/auth/verify-login-otp"
    verify_data = {
        "email": "agent1@toursaas.com",
        "otp": otp
    }
    
    print("Verifying OTP...")
    verify_response = requests.post(verify_url, json=verify_data)
    
    if verify_response.status_code == 200:
        res_data = verify_response.json()
        print("OTP Verification Successful")
        user = res_data.get("user")
        if user:
            print("User Object:")
            print(json.dumps({
                "email": user.get("email"),
                "role": user.get("role"),
                "has_active_subscription": user.get("has_active_subscription"),
                "subscription_status": user.get("subscription_status"),
                "subscription_end_date": user.get("subscription_end_date")
            }, indent=2))
        else:
            print("No user object returned in LoginResponse")
            print(json.dumps(res_data, indent=2))
    else:
        print(f"OTP Verification Failed. Writing full error to error_log.txt")
        with open("error_log.txt", "w") as f:
            f.write(verify_response.text)

if __name__ == "__main__":
    test_full_login_flow()
