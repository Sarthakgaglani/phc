"""The I/O-touching glue between the ledger, the latest forecast, and the
pure StockRisk calculation — kept separate from stock_risk.py so that
function stays a pure, trivially-testable function over plain values."""
from core.models import RiskConfig
from forecasting.services.forecast_engine import latest_forecast
from forecasting.services.stock_risk import StockRisk, compute_stock_risk
from inventory.services import current_stock


def get_current_stock_risk(phc, medicine, config: RiskConfig | None = None) -> StockRisk:
    stock = current_stock(phc, medicine)
    demand_forecast = latest_forecast(phc, medicine)
    predicted_daily_consumption = (
        demand_forecast.predicted_daily_consumption if demand_forecast else 0
    )
    predicted_demand = demand_forecast.predicted_demand if demand_forecast else 0
    return compute_stock_risk(
        phc_id=phc.id,
        medicine_id=medicine.id,
        current_stock=stock,
        predicted_daily_consumption=predicted_daily_consumption,
        predicted_demand=predicted_demand,
        config=config,
    )
