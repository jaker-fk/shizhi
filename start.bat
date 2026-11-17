@echo off
chcp 65001 >nul
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo.
  echo 未找到 Docker。请先安装并启动 Docker Desktop。
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo.
  echo Docker 还没有运行。请先启动 Docker Desktop，再双击本文件。
  pause
  exit /b 1
)

echo.
echo 正在构建并启动「拾知」（MySQL + API + Web）...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方错误信息。
  pause
  exit /b 1
)

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765/"
echo.
echo 已启动：http://127.0.0.1:8765/
echo 停止命令：docker compose down
timeout /t 3 /nobreak >nul
