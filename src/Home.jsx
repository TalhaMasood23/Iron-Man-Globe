import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css";
function Home() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/app");
  };

  return (
    <>
    <div className="main-home-body">
      <div className="left-column">
        <h5 className="home-title-left">Stark Industries</h5>
          <h1 className="home-title-main">IRON MAN SYSTEM</h1>
          <h1 className="home-title-main2">Combat</h1>
          <h1 className="home-title-main2-1"> Action</h1>
          <h1 className="home-title-main3">Status: Online</h1>


          <p className="home-paragraph-text">
  Initializing Stark OS v18.9... Core power at 100%. HUD active. Combat protocols standing by. Awaiting command, sir.
          </p>



      </div>
      <div className="right-column">
        <img className="right-column-image" src="../src/assets/ironman.png" alt="new" />
        <button className="right-column-button" onClick={handleClick}>Start</button>
      </div>
      {/* <button className="home-button" onClick={handleClick}>Start</button> */}
    </div>
    </>
  );
}

export default Home;