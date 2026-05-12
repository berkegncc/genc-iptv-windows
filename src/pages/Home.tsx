/**
 * Home — thin variant switch. The five layouts live in `pages/home/` and
 * pick from `useHomeData` independently. Settings → Tema → Anasayfa
 * stili drives `themeStore.homeStyle`; we map that key to the right
 * component here.
 */
import { useThemeStore } from "../stores/themeStore";
import { HomeBillboard } from "./home/HomeBillboard";
import { HomeTop10 } from "./home/HomeTop10";
import { HomeEditorialHybrid } from "./home/HomeEditorialHybrid";
import { HomeWideTile } from "./home/HomeWideTile";
import { HomeEditorialRails } from "./home/HomeEditorialRails";

export default function Home() {
  const homeStyle = useThemeStore((s) => s.homeStyle);
  switch (homeStyle) {
    case "classic-billboard":
      return <HomeBillboard />;
    case "top10":
      return <HomeTop10 />;
    case "editorial-hybrid":
      return <HomeEditorialHybrid />;
    case "wide-tile":
      return <HomeWideTile />;
    case "editorial-rails":
    default:
      return <HomeEditorialRails />;
  }
}
