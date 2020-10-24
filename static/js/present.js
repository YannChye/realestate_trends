//Tableau Embed function
function initViz() {
  url = "https://public.tableau.com/views/RealEstateTrends_16032694544650/geography?:language=en-GB&:display_count=y&publish=yes&:origin=viz_share_link",
  options = {
      hideToolbar: true,
      width: "100%",
      height: "200px",
  };
  viz = new tableau.Viz(tabMonthlySales, url, options);
}