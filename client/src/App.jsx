import "./App.css";
import Board from "./components/Board";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Board />
    </>
  );
}

export default App;
