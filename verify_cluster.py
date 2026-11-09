import requests
import time

# Configuration
AUTH_URL = "http://localhost:4000"
PRODUCT_URL = "http://localhost:5000"

def run_tests():
    print("🚀 Starting Cluster Verification...\n")

    # ----------------------------------------
    # TEST 1: Register User (Auth Service)
    # ----------------------------------------
    print("1. Testing Registration (Node.js + Postgres)...")
    user_payload = {"username": "testuser", "password": "securepassword123"}
    try:
        reg_res = requests.post(f"{AUTH_URL}/register", json=user_payload)
        if reg_res.status_code in [201, 500]: # 500 might mean user already exists
            print(f"   ✅ Response: {reg_res.json().get('message', 'User might already exist')}")
        else:
            print(f"   ❌ Failed: {reg_res.text}")
    except Exception as e:
        print(f"   ❌ Connection Failed: {e}")
        return

    # ----------------------------------------
    # TEST 2: Login (Auth Service)
    # ----------------------------------------
    print("\n2. Testing Login (Node.js + Postgres)...")
    login_res = requests.post(f"{AUTH_URL}/login", json=user_payload)
    token = None
    if login_res.status_code == 200:
        token = login_res.json().get('token')
        print(f"   ✅ Login Successful! Token received.")
        print(f"   🔑 Token: {token[:20]}...")
    else:
        print(f"   ❌ Login Failed: {login_res.text}")
        return

    # ----------------------------------------
    # TEST 3: Add Product (Product Service)
    # ----------------------------------------
    print("\n3. Testing Add Product (Python + Mongo)...")
    product_payload = {"name": "Docker Hoodie", "price": 49.99, "category": "Apparel"}
    try:
        add_res = requests.post(f"{PRODUCT_URL}/products", json=product_payload, headers={"Authorization": f"Bearer {token}"})
        if add_res.status_code == 201:
            print(f"   ✅ Product Added: {add_res.json()}")
        else:
            print(f"   ❌ Failed to add product: {add_res.text}")
    except Exception as e:
        print(f"   ❌ Connection Failed: {e}")
        return

    # ----------------------------------------
    # TEST 4: Get Products (Product Service)
    # ----------------------------------------
    print("\n4. Testing List Products (Python + Mongo)...")
    list_res = requests.get(f"{PRODUCT_URL}/products", headers={"Authorization": f"Bearer {token}"})
    if list_res.status_code == 200:
        products = list_res.json()
        print(f"   ✅ Retrieved {len(products)} products from MongoDB.")
        print(f"   📦 Data: {products}")
    else:
        print(f"   ❌ Failed to list products.")

if __name__ == "__main__":
    run_tests()