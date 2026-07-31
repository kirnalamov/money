from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status

class RateLimiter:
    """Simple in-memory rate limiter for demonstration purposes."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list[datetime]] = defaultdict(list)
    
    async def __call__(self, request: Request):
        """Check rate limit for the request."""
        # Use IP address as identifier
        client_id = request.client.host if request.client else "unknown"
        
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Clean up old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ]
        
        # Check rate limit
        if len(self.requests[client_id]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        
        # Add current request
        self.requests[client_id].append(now)

def get_rate_limiter(requests_per_minute: int = 60):
    """Factory function to create a rate limiter dependency."""
    return RateLimiter(requests_per_minute=requests_per_minute)
