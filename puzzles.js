// Zagadki: jedna na dzień, od START_DATE. Kolejność grup = trudność (0 łatwa ... 3 podchwytliwa).
// Każde słowo musi należeć do dokładnie jednej grupy. Pułapki = słowa pasujące "na oko" do innej grupy.
const START_DATE = "2026-11-12";

const PUZZLES = [
  [["Polskie rzeki",["WISŁA","ODRA","WARTA","NAREW"]],["Ptaki",["SROKA","WRONA","SOWA","CZAPLA"]],["Auta z PRL-u",["MALUCH","SYRENKA","WARSZAWA","NYSA"]],["Tańce narodowe",["POLONEZ","MAZUR","OBEREK","KRAKOWIAK"]]],
  [["Grzyby",["KURKA","RYDZ","MAŚLAK","KANIA"]],["Na wigilijnym stole",["KARP","OPŁATEK","BARSZCZ","MAKOWIEC"]],["Gry karciane",["WOJNA","MAKAO","TYSIĄC","PASJANS"]],["Polskie góry",["TATRY","SUDETY","PIENINY","BIESZCZADY"]]],
  [["Owoce",["JABŁKO","GRUSZKA","ŚLIWKA","WIŚNIA"]],["Narzędzia",["MŁOTEK","PIŁA","ŚRUBOKRĘT","KOMBINERKI"]],["Postaci z „Pana Tadeusza”",["ZOSIA","TELIMENA","GERWAZY","HRABIA"]],["Znaki zodiaku",["BARAN","BYK","RAK","WAGA"]]],
  [["Owoce egzotyczne",["MANGO","ANANAS","LICZI","PAPAJA"]],["Ptaki egzotyczne",["KIWI","TUKAN","KOLIBER","PELIKAN"]],["Kamienie szlachetne",["RUBIN","SZAFIR","SZMARAGD","OPAL"]],["Kolory",["BORDO","BEŻ","GRANAT","TURKUS"]]],
  [["Części ciała",["KOLANO","BARK","PIĘTA","RAMIĘ"]],["Instrumenty",["BĘBEN","SKRZYPCE","TRĄBKA","HARFA"]],["Dawne miary",["ŁOKIEĆ","SĄŻEŃ","MILA","MORGA"]],["Polskie słodycze",["MICHAŁKI","KASZTANKI","KRÓWKI","PTASIE MLECZKO"]]],
  [["Meble",["SZAFA","KOMODA","REGAŁ","KREDENS"]],["Pieczywo",["BAGIETKA","KAJZERKA","ROGAL","CHAŁKA"]],["Zawody rzemieślnicze",["PIEKARZ","KOWAL","KRAWIEC","STOLARZ"]],["Wiatry",["HALNY","BRYZA","MONSUN","PASAT"]]],
  [["Kwiaty",["RÓŻA","TULIPAN","BRATEK","FIOŁEK"]],["Owady",["MRÓWKA","PSZCZOŁA","OSA","KOMAR"]],["Style pływackie",["KRAUL","MOTYLEK","GRZBIETOWY","DELFIN"]],["Sieci sklepów",["BIEDRONKA","ŻABKA","STOKROTKA","DINO"]]],
  [["Planety",["WENUS","SATURN","JOWISZ","MERKURY"]],["Jednostki pływające",["KAJAK","JACHT","TRATWA","PROM"]],["Polskie miasta",["GDAŃSK","KRAKÓW","ŁÓDŹ","POZNAŃ"]],["Batony",["MARS","TWIX","LION","BOUNTY"]]],
  [["Miesiące",["MAJ","LIPIEC","LUTY","MARZEC"]],["Drzewa",["LIPA","DĄB","BRZOZA","KLON"]],["Szczyty górskie",["RYSY","GIEWONT","BABIA GÓRA","ŚNIEŻKA"]],["Postaci z baśni",["KOPCIUSZEK","CALINECZKA","KAPTUREK","PINOKIO"]]],
  [["Zupy",["ŻUREK","ROSÓŁ","POMIDOROWA","OGÓRKOWA"]],["Rasy psów",["JAMNIK","PUDEL","OWCZAREK","BULDOG"]],["Figury szachowe",["WIEŻA","GONIEC","SKOCZEK","HETMAN"]],["Karty do gry",["AS","DAMA","WALET","KRÓL"]]],
  [["Zjawiska pogodowe",["GRAD","SZRON","MGŁA","ROSA"]],["Metale",["ZŁOTO","SREBRO","MIEDŹ","ŻELAZO"]],["Waluty",["EURO","FUNT","JEN","RUBEL"]],["Maści koni",["KARY","SIWY","GNIADY","KASZTAN"]]],
  [["Ubrania",["SWETER","KURTKA","SPODNIE","SZALIK"]],["Matematyka",["PIERWIASTEK","CAŁKA","UŁAMEK","POTĘGA"]],["Części roweru",["PEDAŁ","ŁAŃCUCH","SIODEŁKO","KIEROWNICA"]],["Biżuteria",["PIERŚCIONEK","KOLCZYK","BRANSOLETKA","ŁAŃCUSZEK"]]],
  [["W kuchni",["PATELNIA","GARNEK","CHOCHLA","DURSZLAK"]],["Instrumenty dęte",["FLET","TUBA","KLARNET","PUZON"]],["Sporty",["TENIS","RUGBY","HOKEJ","KRYKIET"]],["Modele Volkswagena",["PASSAT","GOLF","POLO","TIGUAN"]]],
  [["W łazience",["WANNA","UMYWALKA","PRYSZNIC","RĘCZNIK"]],["Makarony",["SPAGHETTI","PENNE","LASAGNE","ŚWIDERKI"]],["Gryzonie",["CHOMIK","SZCZUR","WIEWIÓRKA","BÓBR"]],["Sprzęt komputerowy",["MYSZ","KLAWIATURA","MONITOR","DRUKARKA"]]],
  [["Pory roku",["WIOSNA","LATO","JESIEŃ","ZIMA"]],["Ptaki",["WRÓBEL","SIKORKA","SZPAK","GIL"]],["Znaki interpunkcyjne",["KROPKA","PRZECINEK","MYŚLNIK","ŚREDNIK"]],["Polskie potrawy",["BIGOS","GOŁĄBKI","PIEROGI","PLACKI"]]],
  [["Kości",["CZASZKA","ŻEBRO","MOSTEK","KRĘGOSŁUP"]],["Infrastruktura drogowa",["WIADUKT","TUNEL","RONDO","ESTAKADA"]],["Sałaty",["RUKOLA","ROSZPONKA","LODOWA","RZYMSKA"]],["Nakrycia głowy",["MELONIK","CYLINDER","KASZKIET","PANAMA"]]],
  [["Przyprawy",["PIEPRZ","CYNAMON","KMINEK","GAŁKA"]],["Cytrusy",["CYTRYNA","LIMONKA","POMARAŃCZA","GREJPFRUT"]],["Stolice",["LIMA","RZYM","OSLO","KAIR"]],["Państwa",["CHILE","TURCJA","GRUZJA","NIGER"]]],
  [["Emocje",["RADOŚĆ","SMUTEK","ZŁOŚĆ","STRACH"]],["Gatunki filmowe",["WESTERN","HORROR","THRILLER","KOMEDIA"]],["Kolory w kartach",["KIER","KARO","PIK","TREFL"]],["Ryby",["SZCZUPAK","OKOŃ","SUM","LESZCZ"]]],
  [["Figury",["KOŁO","KWADRAT","TRÓJKĄT","ROMB"]],["Części drzewa",["KORZEŃ","PIEŃ","GAŁĄŹ","KORA"]],["Pozycje w piłce nożnej",["BRAMKARZ","OBROŃCA","POMOCNIK","NAPASTNIK"]],["Elementy zamku",["FOSA","BASZTA","BRAMA","DZIEDZINIEC"]]],
  [["Zwierzęta leśne",["DZIK","ŁOŚ","SARNA","LIS"]],["Zioła",["BAZYLIA","MIĘTA","TYMIANEK","LUBCZYK"]],["Sporty zimowe",["BIATHLON","NARCIARSTWO","ŁYŻWIARSTWO","SANECZKARSTWO"]],["Imiona polskich królów",["BOLESŁAW","KAZIMIERZ","ZYGMUNT","WŁADYSŁAW"]]],
  [["Części domu",["DACH","KOMIN","STRYCH","PIWNICA"]],["Ptaki drapieżne",["ORZEŁ","SOKÓŁ","JASTRZĄB","MYSZOŁÓW"]],["Narzędzia ogrodowe",["GRABIE","ŁOPATA","SEKATOR","KONEWKA"]],["W szkole",["TABLICA","KREDA","ŁAWKA","DZIENNIK"]]],
  [["Napoje",["KOMPOT","KEFIR","LEMONIADA","KAKAO"]],["Kolory włosów",["BLOND","RUDY","BRUNET","SZATYN"]],["Choroby",["GRYPA","ODRA","OSPA","ANGINA"]],["Rzeki",["BUG","PILICA","SAN","NOTEĆ"]]],
  [["Organy",["SERCE","WĄTROBA","NERKA","PŁUCO"]],["Instrumenty strunowe",["GITARA","WIOLONCZELA","KONTRABAS","LUTNIA"]],["Owady",["ĆMA","TRZMIEL","ŚWIERSZCZ","WAŻKA"]],["Ciasta",["SERNIK","SZARLOTKA","PIERNIK","BABKA"]]],
  [["Miasta wojewódzkie",["OPOLE","KIELCE","OLSZTYN","RZESZÓW"]],["Płatności",["GOTÓWKA","KARTA","PRZELEW","BLIK"]],["Do pisania",["DŁUGOPIS","OŁÓWEK","PIÓRO","FLAMASTER"]],["Gry planszowe",["SZACHY","WARCABY","CHIŃCZYK","MONOPOL"]]],
  [["Kosmos",["KOMETA","METEORYT","GALAKTYKA","MGŁAWICA"]],["Tkaniny",["JEDWAB","LEN","WEŁNA","BAWEŁNA"]],["Krawiectwo",["IGŁA","NOŻYCZKI","NAPARSTEK","NICI"]],["Buty",["KOZAKI","TRAMPKI","SZPILKI","KLAPKI"]]],
  [["Dni tygodnia",["ŚRODA","PIĄTEK","SOBOTA","NIEDZIELA"]],["Mięso",["SCHAB","BOCZEK","KARKÓWKA","POLĘDWICA"]],["Pory dnia",["ŚWIT","ZMIERZCH","RANEK","WIECZÓR"]],["Strony świata",["WSCHÓD","ZACHÓD","PÓŁNOC","POŁUDNIE"]]],
  [["Kosmetyki",["SZMINKA","TUSZ","PUDER","KREM"]],["W biurze",["ZSZYWACZ","SPINACZ","SEGREGATOR","DZIURKACZ"]],["Gady",["JASZCZURKA","ŻÓŁW","WĄŻ","KROKODYL"]],["Perkusja",["WERBEL","TALERZ","KOTŁY","KSYLOFON"]]],
  [["Nabiał",["SER","JOGURT","MASŁO","ŚMIETANA"]],["Na choince",["BOMBKA","ŁAŃCUCH","GWIAZDA","LAMPKI"]],["Części statku",["RUFA","DZIÓB","MASZT","KOTWICA"]],["Gry podwórkowe",["KLASY","BEREK","CHOWANY","GUMY"]]],
  [["Zwierzęta gospodarskie",["KROWA","OWCA","KOZA","ŚWINIA"]],["Zabawki",["LALKA","KLOCKI","BĄCZEK","JOJO"]],["Kawa",["ESPRESSO","LATTE","AMERICANO","MOCHA"]],["Twarz",["BREW","RZĘSA","POLICZEK","PODBRÓDEK"]]],
  [["Opady",["ŚNIEG","DESZCZ","GRAD","MŻAWKA"]],["Jeziora",["ŚNIARDWY","MAMRY","HAŃCZA","GOPŁO"]],["Nad Bałtykiem",["SOPOT","ŁEBA","USTKA","JASTARNIA"]],["Gazy",["TLEN","AZOT","WODÓR","HEL"]]]
];
