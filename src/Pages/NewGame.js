import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, arrayUnion, writeBatch} from "firebase/firestore";
// import CloseButton from 'react-bootstrap/CloseButton';
import Button from 'react-bootstrap/Button';
import NavBar from '../Components/NavBar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import EditLineup from '../Modules/EditPlayersNewGame';
import SubmitStats from '../Modules/SubmitStats';
import Globals from '../Globals';

const NewGame = () => {
    const { teamName } = useParams();
    const [battingOrder, setBattingOrder] = useState([])
    // const [tempPlayers, setTempPlayers] = useState(players);
    const [gameStats, setGameStats] = useState([]); 
    const [rbis, setRbis] = useState([]);
    const [average, setAverage] = useState([]);
    const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);
    const [lineupToggle, setLineupToggle] = useState(true);
    const [popupToggle, setPopupToggle] = useState(false);
    const [secret, setSecret] = useState("");
    const goodButtons = [{ buttonText:"1st", playerOutcomes: "Single"}, { buttonText:"2nd", playerOutcomes: "Double"}, { buttonText:"3rd", playerOutcomes: "Triple"}, { buttonText:"Homerun", playerOutcomes: "Homerun"}]
    const badButtons = ["Out", "Strikeout", "No Bat"];
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [gameType, setGameType] = useState('');
    const [forceOutcome, setForceOutcome] = useState('auto');
    const [allPlayers, setAllPlayers] = useState();
    const [lineupCards, setLineupCards] = useState([]);
    const [ourScore, setOurScore] = useState(0);
    const [theirScore, setTheirScore] = useState(0);
    const [opponentTeamName, setOpponentTeamName] = useState("");
    const [saveGameResult, setSaveGameResult] = useState({
        show: false,
        success: false,
        message: ''
    });
    const [statsSubmitted, setStatsSubmitted] = useState(false);

    const gameHasStarted = battingOrder.length >= 3 && (
        gameStats.some(stats => stats.length > 0) ||
        rbis.some(r => r > 0) ||
        ourScore > 0 ||
        theirScore > 0
    );

    useEffect(() => {
        const func = async () => {
            //check the cache
            let teamDataJSON = sessionStorage.getItem(teamName + 'Data');
            let docRef = null;
            let docSnap = null;
            let teamPlayersInfo = null;
            if(!teamDataJSON){
                //get data from database
                docRef = doc(db, "teams", teamName);
                docSnap = await getDoc(docRef);
                const dbInfo = docSnap.data();
                //cache it so we don't have to keep making calls to the db
                teamPlayersInfo = {
                    teamInfo: dbInfo,
                    dateCreated: Date.now(),
                }
                sessionStorage.setItem(teamName + 'Data', JSON.stringify(teamPlayersInfo));
            }
            
            if(teamDataJSON)
                teamPlayersInfo = JSON.parse(teamDataJSON);
            
            setData(teamPlayersInfo);
            const playerData = teamPlayersInfo.teamInfo.players;
            console.log('🎯 NewGame - playerData:', playerData);
            console.log('🎯 NewGame - playerData type:', typeof playerData, Array.isArray(playerData) ? 'ARRAY' : 'NOT ARRAY');
            
            setAllPlayers(playerData);//.players.sort((a, b) => a.name > b.name ? 1 : -1));
            setLoading(false);
            const averagesNeeded = [];
            const gameStatsNeeded = [];
            const rbisNeeded = [];
            
            console.log('🎯 NewGame - About to call forEach on playerData');
            playerData.forEach(() => {
                averagesNeeded.push([0, 0]);   
                gameStatsNeeded.push([]);
                rbisNeeded.push(0);
            });

            setAverage(averagesNeeded);
            setGameStats(gameStatsNeeded);
            setRbis(rbisNeeded);
        }
        func();
    }, [teamName]);

    const handleRadioChange = (e) => {
        setSelectedPlayerIdx(Number(e.target.value));
    }

    const handleCompleteBatClick = (e, updatePoints = '') => {

        if (selectedPlayerIdx >= 0){
            const stat = e.target.value;

            if (goodButtons.some((elem) => elem.playerOutcomes === stat) || badButtons.includes(stat) || stat === 'No Bat') {
                const copiedStats = [...gameStats];
                copiedStats[selectedPlayerIdx].push(stat);
                setGameStats(copiedStats);

                if (stat !== 'No Bat') {
                    const copiedAverage = [...average];
                    copiedAverage[selectedPlayerIdx][1] += 1;

                    if (goodButtons.some((elem) => elem.playerOutcomes === stat)) {
                        copiedAverage[selectedPlayerIdx][0] += 1;
                        // Auto-add score for home runs
                        if (stat === "Homerun") {
                            setOurScore(prev => prev + 1);
                        }
                    }
                    setAverage(copiedAverage);
                }
            }
            else if (stat === "RBI+" || (stat === "RBI-" && rbis[selectedPlayerIdx] > 0)){
                const copiedRBIs = [...rbis];
                if (stat === "RBI+"){
                    copiedRBIs[selectedPlayerIdx] += 1;
                    if(updatePoints === 'add')
                        setOurScore(prev => ++prev);
                }
                else{
                    copiedRBIs[selectedPlayerIdx] -= 1;
                    if(updatePoints === 'subtract')
                        setOurScore(prev => --prev);
                }

                setRbis(copiedRBIs);
            }
        }
    }

    const handleDelete = () => {
        if (selectedPlayerIdx >= 0){
            const currGameStats = [...gameStats];
            const currAvgStats = [...average];
            const deletedStat = currGameStats[selectedPlayerIdx].pop();
            if (deletedStat){
                if (goodButtons.some((elem) => elem.playerOutcomes === deletedStat)){
                    currAvgStats[selectedPlayerIdx][0] -= 1;
                    // Auto-remove score if homerun is deleted
                    if (deletedStat === "Homerun") {
                        setOurScore(prev => prev - 1);
                    }
                }
                currAvgStats[selectedPlayerIdx][1] -= 1;
                setAverage(currAvgStats);
                setGameStats(currGameStats);
            }

        }
    }

    const handleLineupForm = (e) => {
        e.preventDefault();
        Globals.toggleCB(setLineupToggle);
        setBattingOrder(lineupCards);
    }

    useEffect(() => {
        if (gameHasStarted) {
            setLineupToggle(false);
        }
    }, [gameHasStarted]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (gameHasStarted && !statsSubmitted) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameHasStarted, statsSubmitted]);
    
    const handleSubmitStatsForm = (e) => {
        e.preventDefault();
        
        try {
            if (data.teamInfo.secret === secret) {
                // get current players information
                const currentYear = new Date().getFullYear() - 1;
                const docRef = doc(db, "teams", teamName);
                // get session information
                let sessionRef = doc(db, "teams", teamName, "allSeasons", currentYear.toString());
                Promise.all([getDoc(docRef), getDoc(sessionRef)]).then(([docSnap, sessionSnap]) => {
                    const batch = writeBatch(db);

                    const originalPlayerStats = docSnap.data().players;
                    
                    const updatedPlayers = originalPlayerStats.map((originalPlayerStat) => {
                        const batter = battingOrder.find(bat => bat.name === originalPlayerStat.name);
                        if (!batter) return originalPlayerStat;

                        const prevStats = {
                            singles: originalPlayerStat.singles,
                            doubles: originalPlayerStat.doubles,
                            triples: originalPlayerStat.triples,
                            homeruns: originalPlayerStat.homeruns,
                            outs: originalPlayerStat.outs,
                            strikeouts: originalPlayerStat.strikeouts,
                            rbis: originalPlayerStat.rbis,
                            games: originalPlayerStat.games,
                        };
                        
                        const idx = battingOrder.map(e => e.name).indexOf(batter.name);
                        gameStats[idx].forEach((type) => {
                            if (type === "Single")
                                prevStats.singles += 1;
                            else if (type === "Double")
                                prevStats.doubles += 1;
                            else if (type === "Triple")
                                prevStats.triples += 1;
                            else if (type === "Homerun")
                                prevStats.homeruns += 1;
                            else if (type === "Strikeout")
                                prevStats.strikeouts += 1;
                            else if (type === "Out") 
                                prevStats.outs += 1;
                        });
                        prevStats.rbis += rbis[idx];
                        if (gameStats[idx].length > 0){
                            prevStats.games += 1;
                        }
                        return { ...originalPlayerStat, ...prevStats };
                    });

                    batch.update(docRef, { players: updatedPlayers });

                    let outcome = 1;
                    if (forceOutcome === 'us') {
                        outcome = 2;
                    } else if (forceOutcome === 'them') {
                        outcome = 0;
                    } else if (ourScore > theirScore) {
                        outcome = 2;
                    } else if (ourScore < theirScore) {
                        outcome = 0;
                    }

                    const sessionData = sessionSnap.exists() ? sessionSnap.data() : { games: [] };
                    const gameNumber = calculateGameNumber(sessionData.games, gameType);

                    const newGameData = {
                        battingOrder: battingOrder.map(person => person.name),
                        datePlayed: new Date(),
                        isPlayoffs: gameType === "playoff",
                        isPractice: gameType === "practice",
                        opponentTeamName: opponentTeamName,
                        ourScore: ourScore,
                        outcome: outcome,
                        theirScore: theirScore,
                        gameNumber: gameNumber
                    };
                    
                    if(sessionSnap.exists())
                        batch.update(sessionRef, { games: arrayUnion(newGameData)});
                    else
                        batch.set(sessionRef, { games: [newGameData] });

                    batch.commit().then(() => {
                        setSaveGameResult({
                            show: true,
                            success: true,
                            message: 'Stats have been successfully added'
                        });
                        setStatsSubmitted(true);
                    });
                });
            } else {
                setSaveGameResult({
                    show: true,
                    success: false,
                    message: 'Wrong team password'
                });
            }
            setSecret("");
        } catch (error) {
            setSaveGameResult({
                show: true,
                success: false,
                message: `Error updating document: ${error}`
            });    
        }
    };

    const calculateGameNumber = (games = [], thisGameType) => {
        let gameTypeCounter = 0;
        const currentGames = Array.isArray(games) ? games : [];
        currentGames.forEach(sessionGame => {
            if ((thisGameType === "playoff" && sessionGame.isPlayoffs) ||
                (thisGameType === "practice" && sessionGame.isPractice) ||
                (thisGameType === "regular" && !sessionGame.isPractice && !sessionGame.isPlayoffs)) {
                gameTypeCounter++;
            }
        });
        return ++gameTypeCounter;
    }

    const goToPreviousBatter = () => {
        selectedPlayerIdx - 1 > -1 ? setSelectedPlayerIdx(prev => prev - 1) : setSelectedPlayerIdx(battingOrder.length - 1);
    }

    const goToNextBatter = () => {
        selectedPlayerIdx + 1 < battingOrder.length ? setSelectedPlayerIdx(prev => prev + 1) : setSelectedPlayerIdx(0);
    }

    const getNext3Batters = (battingOrder, idx) => {
        const battersIndexes = [];
        if(Boolean(battingOrder.length >= 3)){
            if(battingOrder[idx]){
                battersIndexes[0] = [battingOrder[idx]];
                if(battingOrder[idx + 1]){
                    battersIndexes[1] = [battingOrder[idx + 1]];
                    if(battingOrder[idx + 2])
                        battersIndexes[2] = [battingOrder[idx + 2]];
                    else
                        battersIndexes[2] = [battingOrder[0]];
                }
                else{
                    battersIndexes[1] = [battingOrder[0]];
                    battersIndexes[2] = [battingOrder[1]];
                }
            }
            else{
                battersIndexes[0] = [battingOrder[0]];
                battersIndexes[1] = [battingOrder[1]];
                battersIndexes[2] = [battingOrder[2]];
            }
        }
        else 
            return [];
        
        return battersIndexes;
    }
    
    try {
    return (
        <>
            {loading ? (<><h1 className="loading">Loading Game...</h1><NavBar teamName={teamName}/></>) : (
            <>
                {lineupToggle && <EditLineup lineupToggle={lineupToggle} setLineupToggle={setLineupToggle} handleLineupForm={handleLineupForm} allPlayers={allPlayers} lineupCards={lineupCards} setLineupCards={setLineupCards} removePlayerFromFunctions={[setRbis, setGameStats, setAverage]} />}
                {popupToggle && <SubmitStats popupToggle={popupToggle} setPopupToggle={setPopupToggle} setSecret={setSecret} setOpponentTeamName={setOpponentTeamName} handleSubmitStatsForm={handleSubmitStatsForm} setGameType={setGameType} setForceOutcome={setForceOutcome} forceOutcome={forceOutcome} saveGameResult={saveGameResult}/>}
                <NavBar teamName={teamName}/>
                <Container className={`${lineupToggle ? "blurred" : ""}`}>
                    <Row xs={12} className='mb-1'>
                        <Col className='isInlineGrid'>
                            <ButtonGroup>
                                <Button onClick={() => Globals.toggleCB(setLineupToggle)} className={battingOrder.length < 3 ? 'w-100' : 'w-50 whiteBorder'} disabled={gameHasStarted} title={gameHasStarted ? 'Lineup locked after the game starts' : ''}>Lineup</Button>
                                { battingOrder.length >= 3 &&
                                    <Button className='w-50 whiteBorder' variant='success' onClick={()=> Globals.toggleCB(setPopupToggle)}>Submit Stats</Button>
                                }
                            </ButtonGroup>
                        </Col>
                    </Row>
                    <Row className='mb-2'>
                        { battingOrder.length >= 3 &&
                            <Col xs={12}>
                                <ListGroup horizontal className='my-1'>
                                    <ListGroup.Item id='ourScore' className='vertical-align:middle'>Us: {ourScore}</ListGroup.Item>
                                    <ListGroup.Item id='theirScore'>
                                        <Row>
                                            <Col>
                                                <span className='me-1 vertical-align:middle'>Them: {theirScore}</span>
                                            </Col>
                                            <Col className='px-0'>
                                                <ButtonGroup size="sm">
                                                    <Button id='addEnemyScore' onClick={() => setTheirScore(prev => prev + 1)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" variant="success" width="16" height="16" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
                                                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                                                        </svg>
                                                    </Button>
                                                    <Button id='subEnemyScore' onClick={() => setTheirScore(prev => prev === 0 ? 0 : prev - 1)}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-dash" viewBox="0 0 16 16">
                                                            <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                                                        </svg>
                                                    </Button>
                                                </ButtonGroup>
                                            </Col>
                                        </Row>
                                    </ListGroup.Item>
                                </ListGroup>                            
                            </Col>
                        }
                    </Row>
                    <Row id="currentBatterRow" className='mb-2'>
                        { battingOrder.length >= 3  && 
                            <Col className="currentBatterNav">
                                <svg xmlns="http://www.w3.org/2000/svg" onClick={goToPreviousBatter} fill={'currentColor'} className="bi bi-chevron-compact-left goToPreviousBatter" viewBox="5 0 5 16" preserveAspectRatio="none">
                                <path fillRule="evenodd" d="M9.224 1.553a.5.5 0 0 1 .223.67L6.56 8l2.888 5.776a.5.5 0 1 1-.894.448l-3-6a.5.5 0 0 1 0-.448l3-6a.5.5 0 0 1 .67-.223"/>
                                </svg>
                            </Col>
                        }
                        { getNext3Batters(battingOrder, selectedPlayerIdx)[0]?.map((player) => (
                            <Col xs="10" className={`${player === battingOrder[selectedPlayerIdx] ? "selected" : ""}`} key={'selected_' + selectedPlayerIdx}>
                                <label className={`${player === battingOrder[selectedPlayerIdx] ? "selectedPlayer" : "notSelectedPlayer"}`} htmlFor={player.name}>
                                    <ListGroup>
                                        <ListGroup.Item className='lineupListGroupItemTop'>Batter # {(selectedPlayerIdx + 1)}</ListGroup.Item>
                                    </ListGroup>
                                    <ListGroup horizontal>
                                        <ListGroup.Item className='lineupListGroupItem' id="battingPlayersName">{player.name?.substring(0,10)}</ListGroup.Item>
                                        <ListGroup.Item className='lineupListGroupItem' id="battingPlayersAverage">{average[selectedPlayerIdx][0]}/{average[selectedPlayerIdx][1]}</ListGroup.Item>
                                        <ListGroup.Item className='lineupListGroupItem' id="battingPlayersRBIs">{rbis[selectedPlayerIdx]} RBIs</ListGroup.Item>
                                    </ListGroup>
                                    <ListGroup> 
                                        <ListGroup.Item className='lineupListGroupItemBottom'>{gameStats[selectedPlayerIdx].length ? gameStats[selectedPlayerIdx].join(", ") : 'No Bats Yet'}</ListGroup.Item>
                                    </ListGroup>
                                </label>
                            </Col>
                        ))}
                        { battingOrder.length >= 3  &&
                            <Col className="currentBatterNav">
                                <svg xmlns="http://www.w3.org/2000/svg" onClick={goToNextBatter} fill={'currentColor'} className="bi bi-chevron-compact-right goToNextBatter" viewBox="6 0 5 16" preserveAspectRatio="none">
                                    <path fillRule="evenodd" d="M6.776 1.553a.5.5 0 0 1 .671.223l3 6a.5.5 0 0 1 0 .448l-3 6a.5.5 0 1 1-.894-.448L9.44 8 6.553 2.224a.5.5 0 0 1 .223-.671"/>
                                </svg>
                            </Col>
                        }
                    </Row>
                    <Row className='mb-2'>
                        <Col xs={{ span: 10, offset: 1 }}>
                            <ListGroup>
                                {getNext3Batters(battingOrder, selectedPlayerIdx)[1]?.map((player) => (
                                    <ListGroup.Item key={`OnDeck${player.name}`}><b>Deck: </b>{player.name}</ListGroup.Item>
                                ))}
                                {getNext3Batters(battingOrder, selectedPlayerIdx)[2]?.map((player) => (
                                    <ListGroup.Item key={`OnDeck${player.name}`}><b>Hole: </b>{player.name}</ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col className='px-2 isInlineGrid' xs={12} md={11}>
                            { battingOrder.length >= 3 && (
                            <>
                                <ButtonGroup className='mb-1'>
                                    <Button className="px-1 buttonGroupLabel whiteBorder" disabled>On Base</Button>
                                    {goodButtons.map((btn, idx) =>
                                        <Button className="px-1 whiteBorder" value={btn.playerOutcomes} key={`goodButton_${idx}`} onClick={handleCompleteBatClick}>{btn.buttonText}</Button>
                                    )}
                                </ButtonGroup>
                                <ButtonGroup className='mb-1'>
                                    <Button className="px-1 buttonGroupLabel whiteBorder" disabled>Points</Button>
                                    <Button className="px-1 whiteBorder btnGroup2Items" value="RBI+" onClick={(e) => handleCompleteBatClick(e, 'add')}>RBI+</Button>
                                    <Button className="px-1 whiteBorder btnGroup2Items" variant="warning" value="RBI-" onClick={(e) => handleCompleteBatClick(e, 'subtract')}>RBI-</Button>
                                </ButtonGroup>
                                <ButtonGroup className='mb-1'>
                                    <Button className="px-1 buttonGroupLabel whiteBorder" disabled>Other</Button>
                                    {badButtons.map((btn, idx) => (
                                        <Button className="px-1 whiteBorder btnGroup2Items" key={`badButton_${idx}`} variant="danger" value={btn} onClick={handleCompleteBatClick}>{btn}</Button>
                                    ))}
                                </ButtonGroup>
                                <ButtonGroup className='mb-0'>
                                    <Button className="delete-Button" variant='warning' onClick={handleDelete}>Delete Stat</Button>
                                </ButtonGroup>
                            </>
                            )}
                        </Col>
                    </Row>
                    {lineupCards.map((player, idx) => (
                        <input key={'radio_' + idx} id={player.name} type="radio" name="selector" className='hidden' value={idx} checked={player?.name === battingOrder[selectedPlayerIdx]?.name} onChange={handleRadioChange} />
                    ))}
                </Container>
            </>)}
        </>
    )}
    catch(e){
       console.error(e);
    }
};

export default NewGame;
