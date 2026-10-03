from fastapi import APIRouter
from typing import List, Dict

router = APIRouter(prefix="/api/examples", tags=["examples"])

EDUCATIONAL_EXAMPLES = [
    {
        "id": "aliasing",
        "title": "1. Aliasing & Memory Pointers",
        "description": "Watch two variables reference the EXACT same list in memory. When list2 is modified, list1 changes too!",
        "level": "beginner",
        "code": """# Variables pointing to the same memory address (Aliasing)
list1 = [10, 20, 30]
list2 = list1  # list2 points to list1's memory address!

list2.append(40)
print(f"list1: {list1}")
print(f"list2: {list2}")
"""
    },
    {
        "id": "recursion",
        "title": "2. Recursion & Call Stack Frames",
        "description": "Watch stack frames push onto the call stack with their own local scopes, then pop off with return values.",
        "level": "intermediate",
        "code": """def fib(n):
    if n <= 1:
        return n
    left = fib(n - 1)
    right = fib(n - 2)
    return left + right

result = fib(3)
print(f"Fibonacci(3) = {result}")
"""
    },
    {
        "id": "loop_accumulation",
        "title": "3. Loop & Memory Growth",
        "description": "Observe how memory usage increments with each iteration as items are calculated and stored.",
        "level": "beginner",
        "code": """numbers = [4, 1, 7, 3]
doubled = []

for num in numbers:
    val = num * 2
    doubled.append(val)

total = sum(doubled)
print("Doubled:", doubled)
print("Total:", total)
"""
    },
    {
        "id": "mock_db",
        "title": "4. External Systems: Mock Database",
        "description": "Execute simulated SQL queries against an in-memory database and see query events in the external timeline.",
        "level": "intermediate",
        "code": """# Query existing users from mock DB
students = db.query("SELECT * FROM users WHERE role = 'student'")

# Add a new user to the database
new_student = db.insert("users", {
    "name": "Diana",
    "role": "student",
    "score": 98
})

updated_list = db.query("SELECT * FROM users")
print(f"Total students now: {len(updated_list)}")
"""
    },
    {
        "id": "mock_api",
        "title": "5. External Systems: Mock API Fetch",
        "description": "Simulate network API calls and inspect HTTP request/response payloads in real-time.",
        "level": "beginner",
        "code": """# Fetch live weather data from mock API
response = api.get("https://api.weather.com/v1/forecast")
weather_data = response.json()

city = weather_data.get("city")
temp = weather_data.get("temp_c")

# Post an automated telemetry alert
alert_resp = api.post("https://api.weather.com/v1/alerts", json={
    "city": city,
    "current_temp": temp,
    "status": "normal"
})
print("Alert status:", alert_resp.status_code)
"""
    }
]

@router.get("")
def get_examples() -> List[Dict]:
    return EDUCATIONAL_EXAMPLES
