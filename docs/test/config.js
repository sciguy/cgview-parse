///////////////////////////////////////////////////////////////////////////////
// Config JSON passed to CGViewBuilder
///////////////////////////////////////////////////////////////////////////////

var jsonConfig = {
  annotation: {
    font: 'sans-serif, plain, 8'
  },
  ruler: {
    font: 'sans-serif, plain, 6'
  },
  captions: [
    {
      name: 'DEFINITION',
      textAlignment: "center",
      font: "sans-serif,plain,7",
      fontColor: "darkblue",
      position: "bottom-center",
    },
    {
      name: 'ID',
      textAlignment: "right",
      font: "sans-serif,bold,10",
      fontColor: "darkgreen",
      position: "top-right",
    },
  ],
  legend: {
    position: 'top-left',
    alignment: 'left',
    backgroundColor: 'rgba(255,255,255,0.75)',
    defaultFont: 'sans-serif, plain, 6',
    defaultFontColor: 'black',
    items: [
      {name: 'CDS', swatchColor: 'rgba(0,0,153,0.5)', decoration: 'arrow'},
    ]
  }
};