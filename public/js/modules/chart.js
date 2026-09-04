export const initializeActivityChart = () => {
  const element = document.getElementById("activity-chart");
  if (!element || !window.echarts) {
    return;
  }

  const chartData = JSON.parse(element.dataset.chart);
  const chart = window.echarts.init(element);
  const formatHours = (value) =>
    Number(value).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  const isDark = document.documentElement.classList.contains("dark");
  const hasStackedSeries = Array.isArray(chartData.series) && chartData.series.length > 0;

  const series = hasStackedSeries
    ? chartData.series.map((item) => ({
      name: item.label,
      type: "bar",
      stack: "duration",
      data: item.values,
      itemStyle: { color: item.color },
      barMaxWidth: 28,
    }))
    : [
      {
        name: "Duration",
        type: "bar",
        data: chartData.values,
        itemStyle: { color: isDark ? "#F0EDE8" : "#111111" },
        barMaxWidth: 28,
      },
    ];

  chart.setOption({
    animationDuration: 300,
    grid: { left: 48, right: 8, top: 32, bottom: 32 },
    legend: hasStackedSeries
      ? {
        top: 0,
        textStyle: { color: isDark ? "#9CA3AF" : "#4B5563" },
      }
      : undefined,
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "#242424" : "#FFFFFF",
      borderColor: isDark ? "#2C2C2C" : "#DDD8CF",
      textStyle: { color: isDark ? "#F0EDE8" : "#111111" },
      valueFormatter: (value) => `${formatHours(value)} hours`,
    },
    xAxis: {
      type: "category",
      data: chartData.labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#9CA3AF", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "Hours",
      nameTextStyle: { color: "#9CA3AF", fontSize: 11 },
      splitLine: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#9CA3AF", formatter: (value) => `${formatHours(value)}h` },
    },
    series,
  });

  window.addEventListener("resize", () => chart.resize());
};
