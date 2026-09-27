from fastapi import APIRouter, HTTPException, status, Depends
from app.core.security import verify_password, create_access_token, get_current_user_optional
from app.schemas.schemas import UserLogin, TokenResponse, UserResponse
from app.database.connection import get_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, password_hash, role, department FROM users WHERE email = %s;", (creds.email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not user or not verify_password(creds.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Use admin@geoharmonize.gov / admin123 or analyst@geoharmonize.gov / analyst123."
        )
        
    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"]
    }
    access_token = create_access_token(data={"sub": user["email"], "role": user["role"], "name": user["name"], "id": user["id"]})
    return TokenResponse(access_token=access_token, user=UserResponse(**user_data))

@router.get("/me", response_model=UserResponse)
def get_current_user(current_user: dict = Depends(get_current_user_optional)):
    return UserResponse(
        id=current_user.get("id", 2),
        name=current_user.get("name", "Alex Mercer"),
        email=current_user.get("email", "analyst@geoharmonize.gov"),
        role=current_user.get("role", "GIS_ANALYST"),
        department=current_user.get("department", "Directorate of Land Records & Cadastral GIS")
    )
