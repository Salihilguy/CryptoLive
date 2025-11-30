import { useState, useEffect } from 'react'
import io from 'socket.io-client'

// Backend adresine bağlanır
const socket = io.connect("http://localhost:3001")

function App() {
  const [coins, setCoins] = useState([])

  const sortOrder = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

  useEffect(() => {
    // Sunucudan 'tickerUpdate' mesajı gelince bu çalışır
    socket.on("tickerUpdate", (data) => {
      setCoins((prevCoins) => {
        const updatedCoins = [...prevCoins];
        
        data.forEach(newCoin => {
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

  const sortedCoins = [...coins].sort((a, b) => {
    return sortOrder.indexOf(a.symbol) - sortOrder.indexOf(b.symbol);
  });

  return (
    <div className="container" style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>CryptoLive</h1>
      
      <table border="1" cellPadding="15" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th>Sembol</th>
            <th>Fiyat ($)</th>
            <th>Değişim (%)</th>
          </tr>
        </thead>
        <tbody>
          {sortedCoins.map((coin) => (
            <tr key={coin.symbol}>
              <td style={{ fontWeight: 'bold' }}>{coin.symbol}</td>
              <td>{coin.price.toFixed(2)} $</td>
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