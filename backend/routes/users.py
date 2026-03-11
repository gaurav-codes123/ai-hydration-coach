# """
# routes/users.py — User CRUD Endpoints
# ======================================
# POST   /users/register    → Create new user
# GET    /users/{user_id}   → Get user profile
# PUT    /users/{user_id}   → Update user profile
# DELETE /users/{user_id}   → Delete user
# GET    /users/            → List all users (admin)
# """
# import uuid
# from typing import List
# from fastapi import APIRouter, HTTPException, Depends, status
# from sqlalchemy.orm import Session
# from database import get_db
# from models import User
# from schemas import UserCreate, UserUpdate, UserResponse, MessageResponse
# router = APIRouter(prefix="/users", tags=["Users"])
# # ─────────────────────────────────────────────
# # GET /users/by-email/{email}
# # ─────────────────────────────────────────────
# @router.get(
#     "/by-email/{email}",
#     response_model=UserResponse,
#     summary="Get user by email (for returning users login)",
# )
# def get_user_by_email(email: str, db: Session = Depends(get_db)):
#     """Retrieve a user profile by their email address. Used for returning user login."""
#     user = db.query(User).filter(User.email == email).first()
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"No user found with email '{email}'. Please create a new profile.",
#         )
#     return user
#     # ─────────────────────────────────────────────
# # POST /users/register
# # ─────────────────────────────────────────────
# @router.post(
#     "/register",
#     response_model=UserResponse,
#     status_code=status.HTTP_201_CREATED,
#     summary="Register a new user",
# )
# def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
#     """
#     Create a new user profile.
#     - **name**: Full name (2–100 chars)
#     - **email**: Unique email address
#     - **weight**: Weight in kg (20–300)
#     - **age**: Age in years (5–110)
#     - **gender**: male or female
#     - **activity_level**: sedentary / light / moderate / high / extreme
#     - **city**: Optional city for weather fetching
#     """
#     # Check if email already exists
#     existing = db.query(User).filter(User.email == user_data.email).first()
#     if existing:
#         raise HTTPException(
#             status_code=status.HTTP_409_CONFLICT,
#             detail=f"Email '{user_data.email}' is already registered.",
#         )
#     # Create new user
#     new_user = User(
#         id=uuid.uuid4(),
#         name=user_data.name,
#         email=user_data.email,
#         weight=user_data.weight,
#         age=user_data.age,
#         gender=user_data.gender,
#         activity_level=user_data.activity_level,
#         city=user_data.city,
#     )
#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)
#     return new_user
# # ─────────────────────────────────────────────
# # GET /users/{user_id}
# # ─────────────────────────────────────────────
# @router.get(
#     "/{user_id}",
#     response_model=UserResponse,
#     summary="Get user by ID",
# )
# def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
#     """Retrieve a user profile by their UUID."""
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"User with id '{user_id}' not found.",
#         )
#     return user
# # ─────────────────────────────────────────────
# # PUT /users/{user_id}
# # ─────────────────────────────────────────────
# @router.put(
#     "/{user_id}",
#     response_model=UserResponse,
#     summary="Update user profile",
# )
# def update_user(user_id: uuid.UUID, update_data: UserUpdate, db: Session = Depends(get_db)):
#     """
#     Update a user's profile fields. Only provided fields are updated.
#     """
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"User with id '{user_id}' not found.",
#         )
#     # Update only provided fields
#     update_dict = update_data.model_dump(exclude_unset=True)
#     for field, value in update_dict.items():
#         setattr(user, field, value)
#     db.commit()
#     db.refresh(user)
#     return user
# # ─────────────────────────────────────────────
# # DELETE /users/{user_id}
# # ─────────────────────────────────────────────
# @router.delete(
#     "/{user_id}",
#     response_model=MessageResponse,
#     summary="Delete user",
# )
# def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
#     """Delete a user and all their associated data (cascade)."""
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"User with id '{user_id}' not found.",
#         )
#     db.delete(user)
#     db.commit()
#     return {"message": f"User '{user.name}' deleted successfully.", "success": True}
# # ─────────────────────────────────────────────
# # GET /users/
# # ─────────────────────────────────────────────
# @router.get(
#     "/",
#     response_model=List[UserResponse],
#     summary="List all users (admin)",
# )
# def list_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
#     """List all registered users. Supports pagination via skip/limit."""
#     users = db.query(User).offset(skip).limit(limit).all()
#     return users

"""
routes/users.py — User CRUD Endpoints
======================================
POST   /users/register        → Create new user (or return existing)
GET    /users/by-email/{email}→ Get user by email (for login)
GET    /users/{user_id}       → Get user profile
PUT    /users/{user_id}       → Update user profile
DELETE /users/{user_id}       → Delete user
GET    /users/                → List all users (admin)
IMPORTANT: Route order matters in FastAPI.
  /register and /by-email/{email} MUST come before /{user_id}
  otherwise FastAPI will try to parse "by-email" as a UUID and fail.
"""
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserUpdate, UserResponse, MessageResponse
router = APIRouter(prefix="/users", tags=["Users"])
# ─────────────────────────────────────────────
# POST /users/register
# ─────────────────────────────────────────────
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user profile. If the email already exists,
    returns the existing user instead of raising a conflict error.
    Email is always normalized to lowercase before saving.
    """
    # Always normalize email to lowercase
    normalized_email = user_data.email.strip().lower()
    # If email already registered → return existing user (idempotent)
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        return existing
    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        name=user_data.name,
        email=normalized_email,          # ← stored as lowercase
        weight=user_data.weight,
        age=user_data.age,
        gender=user_data.gender,
        activity_level=user_data.activity_level,
        city=user_data.city,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
# ─────────────────────────────────────────────
# GET /users/by-email?email=...
# ─────────────────────────────────────────────
@router.get(
    "/by-email",
    response_model=UserResponse,
    summary="Get user by email (for returning user login)",
)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    """
    Retrieve a user profile by their email address.
    Email is passed as a QUERY parameter to avoid URL encoding issues with '@'.
    Email lookup is case-insensitive — always normalized to lowercase.
    Used by the LoginModal for returning user authentication.
    Example: GET /users/by-email?email=gaurav@example.com
    """
    normalized_email = email.strip().lower()
    print(f"🔍 Looking up user by email: '{normalized_email}'")
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        print(f"❌ No user found with email: '{normalized_email}'")
        # Debug: show all emails in DB
        all_users = db.query(User).all()
        print(f"📋 All emails in DB: {[u.email for u in all_users]}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found with email '{normalized_email}'. Please create a new profile.",
        )
    print(f"✅ Found user: {user.name} ({user.email})")
    return user
# ─────────────────────────────────────────────
# GET /users/{user_id}
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve a user profile by their UUID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id '{user_id}' not found.",
        )
    return user
# ─────────────────────────────────────────────
# PUT /users/{user_id}
# ─────────────────────────────────────────────
@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user profile",
)
def update_user(user_id: uuid.UUID, update_data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user's profile fields. Only provided fields are updated."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id '{user_id}' not found.",
        )
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
# ─────────────────────────────────────────────
# DELETE /users/{user_id}
# ─────────────────────────────────────────────
@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Delete user",
)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a user and all their associated data (cascade)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id '{user_id}' not found.",
        )
    db.delete(user)
    db.commit()
    return {"message": f"User '{user.name}' deleted successfully.", "success": True}
# ─────────────────────────────────────────────
# GET /users/
# ─────────────────────────────────────────────
@router.get(
    "/",
    response_model=List[UserResponse],
    summary="List all users (admin)",
)
def list_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List all registered users. Supports pagination via skip/limit."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users