#!/bin/bash

echo "Setting up Huddle.ai..."

mkdir -p uploads/avatars
mkdir -p uploads/recordings

echo "Creating default avatar files..."
cd uploads/avatars
for i in {1..20}; do
  echo "Creating avatar$i.png placeholder"
  touch "avatar$i.png"
done

cd ../../

echo "Building and starting services..."
docker-compose up --build -d

echo "Waiting for services to start..."
sleep 30

echo "Setup complete!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo "LiveKit: ws://localhost:7880"
echo "MySQL: localhost:3306"
echo "Redis: localhost:6379"

echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"