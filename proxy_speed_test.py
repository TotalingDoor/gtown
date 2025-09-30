import requests
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Discord webhook URL from your app.js
WEBHOOK_URL = "https://discord.com/api/webhooks/1422679259297742930/vsEJOKaGkFWlExkCYNHajU4URADmc9hI5Ue6nTjoWyYKX6rMLIOad4aHlrEgbHQXR59x"

# Test message embed
TEST_EMBED = {
    "embeds": [{
        "title": "🚀 Proxy Speed Test",
        "color": 0x0099ff,
        "fields": [
            {
                "name": "Test Type",
                "value": "Proxy Performance Test",
                "inline": True
            },
            {
                "name": "Timestamp",
                "value": str(int(time.time())),
                "inline": True
            }
        ],
        "footer": {
            "text": "Gorilla Town Proxy Tester"
        }
    }]
}

class ProxyTester:
    def __init__(self):
        self.results = []
        self.lock = threading.Lock()
        self.max_working_proxies = 10
        self.found_enough = False
        
    def load_proxies(self, filename):
        """Load proxies from file"""
        try:
            with open(filename, 'r') as f:
                proxies = [line.strip() for line in f if line.strip()]
            print(f"Loaded {len(proxies)} proxies from {filename}")
            return proxies
        except FileNotFoundError:
            print(f"Error: {filename} not found!")
            return []
    
    def test_proxy(self, proxy_address, timeout=10):
        """Test a single proxy by sending Discord webhook"""
        proxy_url = f"http://{proxy_address}"
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        try:
            start_time = time.time()
            
            response = requests.post(
                WEBHOOK_URL,
                json=TEST_EMBED,
                proxies=proxies,
                timeout=timeout,
                headers={'Content-Type': 'application/json'}
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            if response.status_code == 204:  # Discord webhook success
                with self.lock:
                    if len(self.results) < self.max_working_proxies:
                        result = {
                            'proxy': proxy_address,
                            'status': 'SUCCESS',
                            'response_time': response_time,
                            'status_code': response.status_code
                        }
                        self.results.append(result)
                        print(f"✅ {proxy_address} - {response_time:.2f}s ({len(self.results)}/{self.max_working_proxies})")
                        
                        if len(self.results) >= self.max_working_proxies:
                            self.found_enough = True
                        return result
                    else:
                        return None
            else:
                print(f"❌ {proxy_address} - HTTP {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            print(f"⏰ {proxy_address} - Timeout")
            return None
        except requests.exceptions.ConnectionError:
            print(f"🔌 {proxy_address} - Connection Error")
            return None
        except requests.exceptions.ProxyError:
            print(f"🚫 {proxy_address} - Proxy Error")
            return None
        except Exception as e:
            print(f"💥 {proxy_address} - Error: {str(e)}")
            return None
    
    def test_all_proxies(self, proxies, max_workers=50):
        """Test all proxies concurrently until we find enough working ones"""
        print(f"\n🚀 Starting proxy tests with {max_workers} concurrent workers...")
        print(f"Looking for {self.max_working_proxies} working proxies from {len(proxies)} total...\n")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all proxy tests
            futures = []
            for proxy in proxies:
                if not self.found_enough:
                    future = executor.submit(self.test_proxy, proxy)
                    futures.append(future)
                else:
                    break
            
            # Process completed tests
            completed = 0
            for future in as_completed(futures):
                completed += 1
                if self.found_enough:
                    print(f"\n🎉 Found {self.max_working_proxies} working proxies! Stopping search...")
                    # Cancel remaining futures
                    for f in futures:
                        f.cancel()
                    break
                if completed % 50 == 0:
                    print(f"Progress: {completed} tested, {len(self.results)} working found")
    
    def print_results(self):
        """Print sorted results by speed"""
        if not self.results:
            print("\n❌ No successful proxy connections found!")
            return
        
        # Sort by response time (fastest first)
        sorted_results = sorted(self.results, key=lambda x: x['response_time'])
        
        print(f"\n🏆 PROXY SPEED RANKING - Top {len(sorted_results)} Working Proxies:")
        print("=" * 70)
        print(f"{'Rank':<6} {'Proxy Address':<25} {'Speed (seconds)':<15} {'Status'}")
        print("-" * 70)
        
        for i, result in enumerate(sorted_results, 1):
            print(f"{i:<6} {result['proxy']:<25} {result['response_time']:.3f}s{'':<8} ✅")
        
        print(f"\n📊 SUMMARY:")
        print(f"Total working proxies: {len(sorted_results)}")
        print(f"Fastest proxy: {sorted_results[0]['proxy']} ({sorted_results[0]['response_time']:.3f}s)")
        if len(sorted_results) > 1:
            print(f"Slowest proxy: {sorted_results[-1]['proxy']} ({sorted_results[-1]['response_time']:.3f}s)")
        
        # Save results to file
        with open('proxy_results.json', 'w') as f:
            json.dump(sorted_results, f, indent=2)
        print(f"\n💾 Results saved to proxy_results.json")

def main():
    while True:
        tester = ProxyTester()
        
        # Load proxies from file
        proxies = tester.load_proxies('proxylist.txt')
        
        if not proxies:
            return
        
        print(f"⚠️  This will find 10 working proxies from {len(proxies)} total proxies.")
        response = input("Continue? (y/n): ")
        
        if response.lower() != 'y':
            print("Test cancelled.")
            return
        
        # Test proxies until we find 10 working ones
        start_total = time.time()
        tester.test_all_proxies(proxies)
        end_total = time.time()
        
        print(f"\n⏱️  Testing time: {end_total - start_total:.2f} seconds")
        
        # Print results
        tester.print_results()
        
        # Ask if user wants to run again
        print(f"\n🔄 Run again to find another batch of 10 proxies?")
        again = input("Continue? (y/n): ")
        if again.lower() != 'y':
            break

if __name__ == "__main__":
    main()