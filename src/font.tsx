import { VNode, h } from "preact";
import { icon_font } from "./styles.css";

const mk = (child: VNode<any>) => {
  const node = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" class={icon_font}>
    {child}
  </svg>;
  return () => node;
};

const power = "M857 650q0 87 -34 166t-91 137 -137 92 -166 34 -167 -34 -136 -92 -92 -137 -34 -166q0 -102 45 -191t126 -151q24 -18 54 -14t46 28q18 23 14 53t-28 47q-54 41 -84 101t-30 127q0 58 23 111t61 91 91 61 111 23 110 -23 92 -61 61 -91 22 -111q0 -68 -30 -127t-84 -101q-23 -18 -28 -47t14 -53q17 -24 47 -28t53 14q81 61 126 151t45 191zm-357 -429v358q0 29 -21 50t-50 21 -51 -21 -21 -50v-358q0 -29 21 -50t51 -21 50 21 21 50z";
const video = "M1000 346v608q0 23 -22 32 -7 3 -14 3 -15 0 -25 -10l-225 -225v92q0 67 -47 114t-113 47h-393q-67 0 -114 -47t-47 -114v-392q0 -67 47 -114t114 -47h393q66 0 113 47t47 114v92l225 -225q10 -10 25 -10 7 0 14 2 22 10 22 33z";

export const NoEntry = mk(<path d="M679 686v-72q0 -14 -11 -25t-25 -10h-429q-14 0 -25 10t-10 25v72q0 14 10 25t25 10h429q14 0 25 -10t11 -25zm178 -36q0 117 -57 215t-156 156 -215 58 -216 -58 -155 -156 -58 -215 58 -215 155 -156 216 -58 215 58 156 156 57 215z" />);
export const Off = mk(<path d={power} />);
export const On = mk(<path d={power} fill="green" />);
export const Camera = mk(<path d="M536 525q66 0 113 47t47 114 -47 113 -113 47 -114 -47 -47 -113 47 -114 114 -47zm393 -232q59 0 101 42t41 101v500q0 59 -41 101t-101 42h-786q-59 0 -101 -42t-42 -101v-500q0 -59 42 -101t101 -42h125l28 -76q11 -27 39 -47t58 -20h286q29 0 57 20t39 47l29 76h125zm-393 643q103 0 176 -74t74 -176 -74 -177 -176 -73 -177 73 -73 177 73 176 177 74z" />);
export const Videocam = mk(<path d={video} />);
export const VideocamRecording = mk(<path d={video} fill="red" />);
