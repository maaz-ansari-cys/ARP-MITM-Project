import asyncio; from database import get_database, connect_to_mongodb
async def check_db():
    await connect_to_mongodb()
    db = get_database()
    devices = await db.devices.find({}).to_list(length=100)
    print([(d.get('ip_address'), d.get('status'), d.get('network_subnet')) for d in devices])
asyncio.run(check_db())
