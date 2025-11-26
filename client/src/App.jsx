import { useState, useEffect } from 'react'
import io from 'socket.io-client'

// Backend adresine bağlanır
const socket = io.connect("http://localhost:3001")

function App() {
  const [btcPrice, setBtcPrice] = useState("Bekleniyor...")

  useEffect(() => {
    // Sunucudan 'priceUpdate' mesajı gelince bu çalışır
    socket.on("priceUpdate", (data) => {
      console.log("Veri geldi:", data)
      setBtcPrice(data.price)
    })
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>CryptoLive</h1>
      <h2>Bitcoin Fiyatı:</h2>
      <h1 style={{ color: 'green', fontSize: '60px' }}>
        ${btcPrice}
      </h1>
    </div>
  )
}

export default App