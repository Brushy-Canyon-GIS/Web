import os
from databases import Database

DATABASE_URL = os.getenv("DATABASE_URL")

database = Database(
    DATABASE_URL,
    min_size=1,
    max_size=5,
    statement_cache_size=0  # asyncpg kwarg passed directly, not via connect_args
)