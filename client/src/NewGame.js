import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
// import CloseButton from 'react-bootstrap/CloseButton';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import NavBar from './NavBar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';


const NewGame = () => {

    const { teamName } = useParams();
    const [players, setPlayers] = useState(["Select a player", "Select a player", "Select a player", "Select a player", "Select a player", "Select a player", "Select a player", "Select a player", "Select a player", "Select a player"])
    const [tempPlayers, setTempPlayers] = useState(players);
    const [gameStats, setGameStats] = useState([[], [], [], [], [], [], [], [], [], []]);
    const [rbis, setRbis] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const [average, setAverage] = useState([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]);
    const [selectedPlayerIdx, setSelectedPlayerIdx] = useState();
    const [toggle, setToggle] = useState(false);
    const [formToggle, setFormToggle] = useState(false);
    const [popupToggle, setPopupToggle] = useState(false);
    const [layout, setLayout] = useState(true)
    const [secret, setSecret] = useState("");
    const goodButtons = ["Single", "Double", "Triple", "Homerun"]
    const badButtons = ["Out", "Strikeout"];
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const func = async () => {
            const docRef = doc(db, "teams", teamName);
            const docSnap = await getDoc(docRef);
            setData(docSnap.data());
            setLoading(false);
        }
        func();
    }, [teamName]);

    const handleRadioChange = (e) => {
        const idx = Number(e.target.value);
        if (players[idx] !== "Select a player"){
            setSelectedPlayerIdx(Number(e.target.value));
        }
    }

    const handleClick = (e) => {

        if (selectedPlayerIdx >= 0){
            const stat = e.target.value;

            if (goodButtons.includes(stat) || badButtons.includes(stat)){
                const copiedStats = [...gameStats];
                copiedStats[selectedPlayerIdx].push(stat);
                setGameStats(copiedStats);

                const copiedAverage = [...average];
                copiedAverage[selectedPlayerIdx][1] += 1;
    
                if (goodButtons.includes(stat)) {
                    copiedAverage[selectedPlayerIdx][0] += 1;
                }
    
                setAverage(copiedAverage);

                if (toggle) {
                    if (selectedPlayerIdx !== players.length - 1){
                        if (players[selectedPlayerIdx + 1] !== "Select a player")
                            setSelectedPlayerIdx(prev => prev + 1);
                        else 
                            setSelectedPlayerIdx(0);
                    } 
                    else
                        setSelectedPlayerIdx(0);
                }
            }

            else if (stat === "RBI+" || (stat === "RBI-" && rbis[selectedPlayerIdx] > 0)){
                const copiedRBIs = [...rbis];
                if (stat === "RBI+")
                    copiedRBIs[selectedPlayerIdx] += 1;
                else
                    copiedRBIs[selectedPlayerIdx] -= 1;

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
                if (goodButtons.includes(deletedStat)){
                    currAvgStats[selectedPlayerIdx][0] -= 1;
                }
                currAvgStats[selectedPlayerIdx][1] -= 1;
                setAverage(currAvgStats);
                setGameStats(currGameStats);
            }

        }
    }

    const handleToggle = () => {
        setToggle((prev) => !prev);
    }

    const handleFormToggle = () => {
        setFormToggle((prev) => !prev);
    }

    const handlePopupToggle = () => {
        setPopupToggle(prev => !prev);
    }

    const handleChange = (e, idx) => {
        const copyTempPlayers = [...tempPlayers];
        let changeValue = true;
        for (let i = 0; i < copyTempPlayers.length; i++){
            if (e.target.value !== "Select a player" && copyTempPlayers[i] === e.target.value) {
                changeValue = false;
                break;
              }
        }
        if (changeValue){
            copyTempPlayers[idx] = e.target.value;
            setTempPlayers(copyTempPlayers);
        }
    }

    const handleSubmitForm = (e) => {
        e.preventDefault();
        setFormToggle((prev) => !prev);
        setPlayers(tempPlayers);
    }

    const handleLayout = () => {
        setLayout(prev => !prev)
    }
    
    const handleSubmitStats = async (e) => {
        e.preventDefault();
        
        try {
            if (data.secret === secret) {
                
                for (const player of players) {
                    const idx = players.indexOf(player);
                    
                    const docRef = doc(db, "teams", teamName);
                    const docSnap = await getDoc(docRef);
                    const teamPlayers = docSnap.data().players;
                    
                    const updatedPlayers = teamPlayers.map((plyr) => {
                        const prevStats = {
                            singles: plyr.singles,
                            doubles: plyr.doubles,
                            triples: plyr.triples,
                            homeruns: plyr.homeruns,
                            outs: plyr.outs,
                            strikeouts: plyr.strikeouts,
                            rbis: plyr.rbis,
                            games: plyr.games,
                        };
                        if (player === plyr.name) {
                            gameStats[idx].forEach((type) => {
                                if (type === "Single") {
                                    prevStats.singles += 1;
                                } else if (type === "Double") {
                                    prevStats.doubles += 1;
                                } else if (type === "Triple") {
                                    prevStats.triples += 1;
                                } else if (type === "Homerun") {
                                    prevStats.homeruns += 1;
                                } else if (type === "Strikeout") {
                                    prevStats.strikeouts += 1;
                                } else if (type === "Out") {
                                    prevStats.outs += 1;
                                }
                            });
                            prevStats.rbis += rbis[idx];
                            if (gameStats[idx].length > 0){
                                prevStats.games += 1;
                            }
                            return { ...plyr, ...prevStats };
                        }
                        return plyr;
                    });
                    
                    await updateDoc(docRef, { players: updatedPlayers });
                }
                alert("Stats have been successfully added")
            } else {
                alert("Wrong team password");
            }
            setSecret("");
        } catch (error) {
           alert(`Error updating document: ${error}`);        
        }
    };
    
    return (
        <>
            {loading ? (<><h1 className="loading">Loading Stats...</h1><NavBar teamName={teamName}/></>) : (
            <>
                {formToggle && (
                    <div className="modal show" style={{ display: 'block', position: 'initial' }}>
                        <Modal id="selectPlayersModal" show={formToggle} onHide={handleFormToggle}>
                            <Modal.Header closeButton>
                                <Modal.Title>Edit Players</Modal.Title>
                            </Modal.Header>
                            <Modal.Body id="selectPlayersModelBody">
                                <Form>
                                    {tempPlayers.map((player, idx) => (
                                        <Form.Group className="mb-3" controlId={"formPlayer" + idx}>
                                            <Form.Select key={idx} value={player} onChange={(e) => handleChange(e, idx)} aria-label='Select players'>
                                                <option value="Select a player">Select a player</option>
                                                {data.players.map(playerData => (
                                                    <option key={playerData.name} value={playerData.name}>
                                                        {playerData.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    ))}
                                </Form>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button onClick={handleFormToggle}>Close</Button>
                                <Button type="submit">Save</Button>
                            </Modal.Footer>
                        </Modal>
                    </div>
                )}

                {popupToggle && (
                    <div className="modal show" style={{ display: 'block', position: 'initial' }}
                    >
                        <Modal show={popupToggle} onHide={handlePopupToggle}>
                            <Modal.Header closeButton>
                            <Modal.Title>Submit Stats</Modal.Title>
                            </Modal.Header>
                    
                            <Form>
                                <Modal.Body>
                                    <Form.Group className="mb-3" controlId="formPassword">
                                        <Form.Label>Team Password</Form.Label>
                                        <Form.Control type="password" placeholder="Password" onChange={(e) => setSecret(e.target.value)} required/>
                                        {/* <input id="secret" type="password" name="secret" value={secret} /> */}
                                    </Form.Group>
                                </Modal.Body>
                        
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={handlePopupToggle}>Close</Button>
                                    <Button type="submit" variant="primary">Submit Stats</Button>
                                </Modal.Footer>
                            </Form>
                        </Modal>
                    </div>
                )}
                <Container className={`${formToggle ? "blurred" : ""}`}>
                    <Row><Col><NavBar teamName={teamName}/></Col></Row>
                    <Row><Col><Button onClick={handlePopupToggle}>Submit Stats</Button></Col></Row>
                    <Row><Col>
                        <h2>Offense:</h2>
                        <div>
                            <Button className="layout" onClick={handleLayout}>{layout ? "2" : "1"}</Button>
                            <Button className="toggle" onClick={handleToggle}>{toggle ? "Auto" : "Manual"}</Button>
                            <Button onClick={handleFormToggle}>Lineup</Button>
                        </div>
                    </Col></Row>
                    <Row><Col>
                        {players[0] === "Select a player" && (
                            <h2 className="empty-boxes">SELECT LINEUP ↗️</h2>
                        )}
                        {players.map((player, idx) => (
                            <div className={`box ${layout ? "two-box" : ""} ${(players[selectedPlayerIdx] !== "Select a player" && player === players[selectedPlayerIdx]) ? "selected" : ""} ${player === "Select a player" ? "hidden" : ""}`} key={idx}>
                                <label htmlFor={player}>
                                    <div className="upperbox">
                                        <div className="player-name">{layout ? player.substring(0,4) + "." : player}</div>
                                        <div className="player-average">{average[idx][0]}/{average[idx][1]}</div>
                                        <div className="player-rbis">{rbis[idx]} {layout ? "" : "RBI's"}</div>
                                    </div>
                                    <div className="lowerbox">
                                        <div>{gameStats[idx].join(", ")}</div>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </Col></Row>
                    <Row><Col>
                        {goodButtons.map((btn) => (
                            <Button key={btn} value={btn} onClick={handleClick}>{btn}</Button>
                        ))}
                    </Col></Row>
                    <Row><Col>
                        <Button value="RBI+" onClick={handleClick}>RBI+</Button>
                        <Button value="RBI-" onClick={handleClick}>RBI-</Button>
                    </Col></Row>
                    <Row><Col>
                        {badButtons.map((btn) => (
                            <Button key={btn} value={btn} onClick={handleClick}>{btn}</Button>
                        ))}
                    </Col></Row>
                    <Row><Col>
                        <Button className="delete-Button" onClick={handleDelete}>Delete Stat</Button>
                    </Col></Row>
                    <Row><Col>
                        {players.map((player, idx) => (
                            <input key={idx} id={player} type="radio" name="selector" className='hidden' value={idx} checked={player === players[selectedPlayerIdx]} onChange={handleRadioChange} />
                        ))}
                    </Col></Row>
                </Container>
            </>)}
        </>
    )
};

export default NewGame;
