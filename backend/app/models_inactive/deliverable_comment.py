from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class AuthorType(str, enum.Enum):
    CLIENT = "client"
    TEAM = "team"

class DeliverableComment(Base):
    __tablename__ = "deliverable_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_type = Column(Enum(AuthorType), nullable=False)  # client o team
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    deliverable_id = Column(Integer, ForeignKey("deliverables.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Si es team
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # Si es client
    
    deliverable = relationship("Deliverable", back_populates="comments")
    user = relationship("User")
    client = relationship("Client", back_populates="comments")