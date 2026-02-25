import os
import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class JGrantsClient:
    """
    j-Grants API Client
    Documentation: https://digital-go-jp.github.io/jgrants-portal-api-doc/
    """
    BASE_URL = "https://api.jgrants-portal.go.jp/exp"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("JGRANTS_API_KEY")
        self.headers = {
            "Accept": "application/json",
            "X-Api-Key": self.api_key
        } if self.api_key else {"Accept": "application/json"}

    async def search_subsidies(self, keyword: str = "", limit: int = 20) -> List[Dict[str, Any]]:
        """
        補助金一覧を取得する (V2)
        GET /v2/public/subsidies
        """
        async with httpx.AsyncClient() as client:
            # V2ではキーワード検索などのパラメータ名が異なる可能性があるが、最小限の設定で試行
            params = {"keyword": keyword, "limit": str(limit)} if keyword else {"limit": str(limit)}
            try:
                # V2エンドポイントを優先
                url = f"{self.BASE_URL}/v2/public/subsidies"
                response = await client.get(url, params=params, headers=self.headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    # V2のレスポンス構造に合わせる (data.result or data.subsidies 等)
                    return data.get("result", [])
                else:
                    logger.warning(f"J-Grants API V2 Error: {response.status_code} {response.text}")
                    # V1へのフォールバック
                    response_v1 = await client.get(f"{self.BASE_URL}/v1/public/subsidies", params=params, headers=self.headers)
                    if response_v1.status_code == 200:
                        return response_v1.json().get("result", [])
                    return []
            except Exception as e:
                logger.error(f"J-Grants API Connection Error: {e}")
                return []

    async def get_subsidy_detail(self, subsidy_id: str) -> Optional[Dict[str, Any]]:
        """
        補助金詳細を取得する (V2)
        GET /v2/public/subsidies/id/{id}
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.BASE_URL}/v2/public/subsidies/id/{subsidy_id}", headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("result")
                else:
                    logger.warning(f"J-Grants API Detail Error: {response.status_code} {response.text}")
                    return None
            except Exception as e:
                logger.error(f"J-Grants API Detail Connection Error: {e}")
                return None

class JGrantsScraper:
    """
    APIが利用できない場合のフォールバック・スクレイパー
    """
    SEARCH_URL = "https://www.jgrants-portal.go.jp/subsidy/search"
    
    async def scrape_latest_subsidies(self) -> List[Dict[str, Any]]:
        # 注: 本格的なスクレイピングにはPlaywright等が必要だが、
        # ここではSSRされている情報があれば抽出、なければAPIを優先する
        # 現状はデモ用のスタブを返すか、メッセージを出す
        logger.info("J-Grants Scraper called (Stub)")
        return []
