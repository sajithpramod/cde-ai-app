#!/bin/bash
# Quick recovery script for Docker services after LXC reboot or issues
# Location: /var/www/html/occasion-forecasting/restart-services.sh

cd /var/www/html/occasion-forecasting

echo "=========================================="
echo "  Docker Services Recovery Script"
echo "=========================================="
echo ""

echo "[1/5] Stopping containers..."
docker compose down

echo ""
echo "[2/5] Starting containers..."
docker compose up -d

echo ""
echo "[3/5] Waiting for services to start..."
sleep 5

echo ""
echo "[4/5] Service status:"
docker compose ps

echo ""
echo "[5/5] Testing connectivity..."
echo -n "  App (port 3000): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

echo -n "  Nginx (port 80): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|302\|301"; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

echo -n "  Nginx SSL (port 443): "
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost | grep -q "200\|302"; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

echo ""
echo "=========================================="
echo "  Recovery Complete"
echo "=========================================="
echo ""
echo "View logs with: docker compose logs -f"
echo "Check status: docker compose ps"
