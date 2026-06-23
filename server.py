import asyncio
import json
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis

app = FastAPI()

# Allow our React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("UI Connected to WebSocket!")
    
    # Connect to Redis asynchronously 
    r = await aioredis.from_url("redis://localhost:6379", decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("scored_txns")

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                # Instantly beam the scored transaction to the UI
                await websocket.send_text(message["data"])
            
            # Tiny sleep to yield control back to the event loop
            await asyncio.sleep(0.01)
            
    except Exception as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        await pubsub.unsubscribe("scored_txns")
        await r.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)