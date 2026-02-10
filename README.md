# stockAnalysis（demo 全栈版）

## 功能
- 前端：大盘/策略/股票模块（从后端 API 读取真实数据；不可用时降级示例）
- 后端：FastAPI + SQLite
  - TuShare Pro：股票基础信息、日线K线（含前复权近似）、指数（日线）
  - 策略：DSL 保存 + 自动生成 Python 代码（可审计）+ 执行选股
  - 信号：对单只股票基于真实K线生成买卖事件（demo 级）

## 本地运行

### 1）安装依赖
```powershell
cd "c:\Users\luohuan\Documents\cursor\stockAnalysis"
python -m pip install -r requirements.txt
```

### 2）设置 TuShare token
```powershell
$env:TUSHARE_TOKEN="你的token"
```

### 3）启动后端（同时会托管前端静态页）
```powershell
uvicorn backend.main:app --reload --port 8000
```

### 4）访问
- 页面：`http://127.0.0.1:8000/`
- API 示例：
  - `http://127.0.0.1:8000/api/market/overview`
  - `http://127.0.0.1:8000/api/stocks/search?q=600519`

