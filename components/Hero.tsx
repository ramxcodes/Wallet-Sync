import { useEffect, useState, Suspense, useRef } from "react";
import { FaLinkedinIn } from "react-icons/fa6";
import { Line } from "react-chartjs-2";
import MagicButton from "./MagicButton";
import { Spotlight } from "./ui/Spotlight";
import { TextGenerateEffect } from "./ui/TextGenerateEffect";
import "./hero.css";
import "chart.js/auto";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const CoinModel = () => {
  const { scene } = useGLTF("/scene.gltf"); // Ensure the GLTF file is correct and represents a coin
  const meshRef = useRef<any>();
  const mouse = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false); // To track if mouse has moved

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseMoved.current = true; // Set mouse moved to true on mouse move
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      if (mouseMoved.current) {
        // Smoothly interpolate rotation based on mouse position
        meshRef.current.rotation.y +=
          (mouse.current.x * Math.PI - meshRef.current.rotation.y) * 0.05;
        meshRef.current.rotation.x +=
          (mouse.current.y * Math.PI - meshRef.current.rotation.x) * 0.05;

        // After applying mouse movement, reset mouseMoved flag after a short delay
        setTimeout(() => (mouseMoved.current = false), 100);
      } else {
        // Automatic rotation when there is no mouse movement
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  return <primitive ref={meshRef} object={scene} scale={[2, 2, 2]} />;
};

const Modal = ({
  show,
  onClose,
  coinDetails,
  chartData,
}: {
  show: boolean;
  onClose: () => void;
  coinDetails: any;
  chartData: any;
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="close-button">
          X
        </button>
        {coinDetails ? (
          <div>
            <h2 style={{ fontWeight: "bold" }}>
              {coinDetails.name} ({coinDetails.symbol.toUpperCase()})
            </h2>
            <div className="coin-details-row">
              <img
                src={coinDetails.image.large}
                alt={coinDetails.name}
                className="modal-image"
              />
              <div className="coin-info">
                <p>
                  <strong>Current Price:</strong> $
                  {coinDetails.market_data.current_price.usd.toLocaleString()}
                </p>
                <p>
                  <strong>Market Cap:</strong> $
                  {coinDetails.market_data.market_cap.usd.toLocaleString()}
                </p>
                <p>
                  <strong>24h Change:</strong>{" "}
                  {coinDetails.market_data.price_change_percentage_24h.toFixed(
                    2
                  )}
                  %
                </p>
              </div>
            </div>
            {chartData && (
              <div className="graph-placeholder">
                <Line data={chartData} options={{ responsive: true }} />
              </div>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

const Hero = () => {
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    };

    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false",
      options
    )
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText} - ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        setCryptoData(data);
        setSearchResults(data);
      })
      .catch((err) => {
        console.error("Fetch error: ", err);
        setError(err.message);
      });
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim() === "") {
      setSearchResults(cryptoData);
      return;
    }

    const options = { method: "GET", headers: { accept: "application/json" } };

    fetch(
      `https://api.coingecko.com/api/v3/search?query=${searchTerm}`,
      options
    )
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText} - ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log(data.coins);
        setSearchResults(data.coins);
      })
      .catch((err) => {
        console.error("Fetch error: ", err);
        setError(err.message);
      });
  };

  const handleCoinClick = (coinId: string) => {
    console.log(`Coin clicked: ${coinId}`);
    setModalOpen(true);
    setSelectedCoin(null);
    setChartData(null);

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    };

    fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`, options)
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText} - ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Coin details fetched:", data);
        setSelectedCoin(data);

        const currentTime = Math.floor(Date.now() / 1000);
        const pastTime = currentTime - 30 * 24 * 60 * 60;

        return fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${pastTime}&to=${currentTime}`,
          options
        );
      })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(
              `Network response was not ok: ${response.status} - ${response.statusText} - ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Chart data fetched:", data);
        const prices = data.prices.map((entry: any) => ({
          x: new Date(entry[0]),
          y: entry[1],
        }));
        setChartData({
          labels: prices.map((entry: any) => entry.x.toLocaleDateString()),
          datasets: [
            {
              label: "Price",
              data: prices.map((entry: any) => entry.y),
              fill: false,
              backgroundColor: "rgb(75, 192, 192)",
              borderColor: "rgba(75, 192, 192, 0.2)",
            },
          ],
        });
      })
      .catch((err) => {
        console.error("Fetch error: ", err);
        setError(err.message);
      });
  };

  return (
    <div className="pb-20 pt-36 relative">
      <div>
        <Spotlight
          className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen"
          fill="white"
        />
        <Spotlight
          className="h-[80vh] w-[50vw] top-10 left-full"
          fill="purple"
        />
        <Spotlight className="left-80 top-28 h-[80vh] w-[50vw]" fill="blue" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-center relative my-20">
          <div className="max-w-[89vw] md:max-w-2xl lg:max-w-[60vw] flex flex-col items-center justify-center">
            <p className="tracking-widest text-xs text-center text-blue-100 max-w-80">
              #BuildWithWalletSync
            </p>

            <TextGenerateEffect
              words="The Ultimate Crypto Portfolio Tracker"
              className="text-center text-[40px] md:text-5xl lg:text-6xl"
            />

            <p className="text-center md:tracking-wider mb-4 text-sm md:text-lg lg:text-2xl">
              Connect all your wallets and exchanges in a few clicks.
            </p>

            <a href="https://www.linkedin.com/in/ramcodes/">
              <MagicButton
                title="Connect on"
                icon={<FaLinkedinIn />}
                position="right"
              />
            </a>
          </div>
        </div>

        <form
          className="mt-8 flex flex-col items-center"
          onSubmit={handleSearch}
        >
          <div className="flex align-center gap-2">
            <input
              type="text"
              placeholder="Search Crypto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border p-2 m-1"
            />
            <button
              type="submit"
              className="mt-2 bg-blue-500 text-white px-4 py-2"
            >
              Search
            </button>
          </div>
        </form>

        <div className="cryptoTable">
          {error ? (
            <div className="error-message">
              <p>Error fetching data: {error}</p>
            </div>
          ) : (
            <>
              <div className="table-layout">
                <p>#</p>
                <p>Coins</p>
                <p>Price</p>
                <p className="text-center">24H Change</p>
                <p className="market-cap">Market Cap Rank</p>
              </div>
              {searchResults.map((coin, index) => {
                const isSearchResult = !!coin.thumb;
                return (
                  <div
                    key={coin.id}
                    className="table-layout cursor-pointer"
                    onClick={() => handleCoinClick(coin.id)}
                  >
                    <p>{index + 1}</p>
                    <div className="flex items-center">
                      <img
                        src={isSearchResult ? coin.thumb : coin.image}
                        alt={coin.name}
                        className="w-6 h-6 mr-2"
                      />
                      <p>
                        {coin.name} ({coin.symbol.toUpperCase()})
                      </p>
                    </div>
                    <p>
                      {isSearchResult
                        ? "N/A"
                        : `$${coin.current_price.toLocaleString()}`}
                    </p>
                    <p
                      className={`text-center ${
                        isSearchResult || coin.price_change_percentage_24h < 0
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {isSearchResult
                        ? "N/A"
                        : `${coin.price_change_percentage_24h.toFixed(2)}%`}
                    </p>
                    <p className="market-cap">
                      {coin.market_cap_rank || "N/A"}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <Canvas
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          height: "400px",
        }}
      >
        <ambientLight intensity={2} />
        <directionalLight position={[2, 5, 5]} intensity={1} />
        <pointLight position={[-2, -3, 4]} intensity={2} />
        <Suspense fallback={null}>
          <CoinModel />
          <OrbitControls enableZoom={false} />
        </Suspense>
      </Canvas>

      <Modal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        coinDetails={selectedCoin}
        chartData={chartData}
      />
    </div>
  );
};

export default Hero;

useGLTF.preload("/scene.gltf");