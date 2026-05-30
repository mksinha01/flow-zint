import asyncio
from livekit.agents import Agent
class MyAgent(Agent):
    def __init__(self):
        super().__init__(instructions="test")
        
agent = MyAgent()
print("hasattr chat_ctx:", hasattr(agent, 'chat_ctx'))
print("dir agent:", dir(agent))
