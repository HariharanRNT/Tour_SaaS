from typing import Type, TypeVar, Generic, List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import Query

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

async def paginate(
    db: AsyncSession,
    query,
    page: int = 1,
    page_size: int = 10,
    response_schema: Optional[Type[BaseModel]] = None
) -> PaginatedResponse:
    """
    Generic pagination helper for SQLAlchemy queries.
    """
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Calculate pages
    pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Apply limit/offset
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().unique().all()
    
    if response_schema:
        items = [response_schema.model_validate(item) for item in items]
        
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )

def pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
):
    return {"page": page, "page_size": page_size}
