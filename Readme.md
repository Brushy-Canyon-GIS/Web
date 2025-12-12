Hi!!! This is what you to read to run this project

The project has 2 folders
1. Backend - FAST API code

To start the backend:

Open your terminal in the backend folder 

**On Mac/Linux:**
1. `source venv/bin/activate` - activate the virtual environment
2. `uvicorn app.main:app --reload` - start the server

**On Windows:**
1. `venv\Scripts\activate` - activate the virtual environment
2. `uvicorn app.main:app --reload` - start the server

The backend will be available at http://localhost:8000 


**Important!!!!!!! The database is not accessible on mines wifi so please use your personal hotspot**

**To run unit tests:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m pytest tests/ -v
```

**API Documentation:** http://localhost:8000/docs

2. Frontend - React + Vite code

To start the frontend 
1. navigate the frontend folder in the terminal (note: there is a folder called frontend inside the main frontend folder)
2. npm run dev 

The data is coming from the supabase database and I will give you guys access once I get your email IDs

right now I have only stored the Atlas maps json but we will store all of them eventually 

No need of developing the authentication flow manually because has it in build we just have to use it

