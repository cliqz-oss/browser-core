const STYLES = `
.full-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483646;
  display: block;
}

.overlay {
  opacity: 0.5;
  background-color: black;
}

.hidden {
  display: none;
}

ui {
  z-index: 2147483647;
}

.container {
  width: 80%;
  margin: 0 auto;
}

input {
  margin-top: 100px;
  display: block;
  width: 100%;
  box-sizing: border-box;
}

iframe {
  border: 0px;
  width: 100%;
}
`;

export default STYLES;
