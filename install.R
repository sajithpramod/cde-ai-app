# install.R
required_packages <- c(
  "tidyverse", "compositions", "glmnet", "readxl", "lubridate", "openxlsx",
  "forecast", "zoo", "scales", "ggiraph", "showtext", "systemfonts",
  "jsonlite", "bsts", "Boom", "BoomSpikeSlab"
)

repos <- "https://cloud.r-project.org/"

# install missing packages only
installed <- rownames(installed.packages())
to_install <- setdiff(required_packages, installed)
if (length(to_install) > 0) {
  install.packages(to_install, repos = repos, dependencies = TRUE)
}