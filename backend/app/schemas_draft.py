
# Subscription Schemas
class SubscriptionPlanBase(BaseModel):
    name: str
    price: Decimal
    currency: str = "INR"
    billing_cycle: str = "monthly"
    features: List[str] = []
    booking_limit: int
    user_limit: int = 1
    is_active: bool = True

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: UUID4
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    plan_id: UUID4
    status: str
    start_date: date
    end_date: date
    auto_renew: bool = True

class SubscriptionResponse(SubscriptionBase):
    id: UUID4
    user_id: UUID4
    current_bookings_usage: int
    plan: SubscriptionPlanResponse
    
    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: UUID4
    amount: Decimal
    status: str
    issue_date: date
    due_date: date
    pdf_url: Optional[str] = None
    
    class Config:
        from_attributes = True
