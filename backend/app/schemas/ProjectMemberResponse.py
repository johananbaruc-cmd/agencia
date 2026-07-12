from pydantic import BaseModel

class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    user_name: str
    user_email: str
    role: str
    
    class Config:
        from_attributes = True