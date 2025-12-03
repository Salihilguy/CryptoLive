import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const socket = io.connect("http://localhost:3001")

function App() {
  const [coins, setCoins] = useState([])

  const sortOrder = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
    'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'TRXUSDT', 'DOTUSDT',
    'MATICUSDT', 'LTCUSDT', 'LINKUSDT', 'SHIBUSDT', 'ATOMUSDT'
  ];

  useEffect(() => {
    socket.on("tickerUpdate", (data) => {
      setCoins((prevCoins) => {
        const updatedCoins = [...prevCoins];
        data.forEach(newCoin => {
            // Gelen veriyi sembole göre bul ve güncelle
            const index = updatedCoins.findIndex(c => c.symbol === newCoin.symbol);
            if (index !== -1) {
                updatedCoins[index] = newCoin;
            } else {
                updatedCoins.push(newCoin);
            }
        });
        return updatedCoins;
      });
    })
  }, [])

  // 2. SIRALAMA İŞLEMİ
  const sortedCoins = [...coins].sort((a, b) => {
    return sortOrder.indexOf(a.symbol) - sortOrder.indexOf(b.symbol);
  });

  return (
    <div className="container" style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>CryptoLive</h1>
      
      <table border="1" cellPadding="15" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th>Coin</th>
            <th>Fiyat ($)</th>
            <th>Değişim (%)</th>
          </tr>
        </thead>
        <tbody>
          {sortedCoins.map((coin) => (
            <tr key={coin.symbol} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img 
                    src={coin.logo} 
                    alt={coin.name} 
                    width="40" 
                    height="40"
                    style={{ borderRadius: '50%' }}
                />
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{coin.name}</div>
                    <div style={{ fontSize: '12px', color: 'gray' }}>{coin.symbol}</div>
                </div>
              </td>

              <td style={{ fontWeight: '600' }}>
                ${coin.price.toFixed(2)}
              </td>

              <td style={{ 
                color: parseFloat(coin.change) > 0 ? 'green' : parseFloat(coin.change) < 0 ? 'red' : 'gray', 
                fontWeight: 'bold' 
              }}>
                %{coin.change ? coin.change : "0.00"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App