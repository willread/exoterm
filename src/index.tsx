/* @refresh reload */
import { render } from "solid-js/web";
import "./styles/reset.css";
import "./styles/themes.css";
import "./styles/dos.css";
import "./styles/crt.css";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
