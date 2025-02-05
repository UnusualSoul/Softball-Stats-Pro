import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from "../firebase";
import random from 'random'
import NavBar from '../Components/NavBar';
import { collection, getDocs } from "firebase/firestore";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [teamName, setTeamName] = useState("");
    // const [guessedPassword, setGuessedPassword] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const colRef = collection(db, "teams");
        const teams = [];

        getDocs(colRef)
            .then((snapshot) => {
                console.log('snapshot.docs :', snapshot.docs);
                snapshot.docs.forEach(doc => {
                    teams.push({ ...doc.data(), id: doc.id});
                })
                console.log('teams :', teams);
                const filteredTeams = teams.find((v) => v.name === teamName)
                console.log('filteredTeams :', filteredTeams);
                setTimeout(() => {
                    setIsLoading(false);
                    if (filteredTeams && filteredTeams.name === teamName){
                        navigate(`/menu/${ teamName }`);
                    } else {
                        setTeamName("");
                        alert("Team not found");
                    }
                    console.log(teams);
                }, random.float(1000, 2000));
                if(isLoading){
                    
                }
            })
            .catch(err => {
                console.log(err.message);
            })
    }

    return (
        <>
            <NavBar pageName="Softball Stats Pro" showMenu={false}/>
            <Container className='mx-0'>
                <Row>
                    <Col>
                        <Form onSubmit={handleSubmit} aria-label="Log in to Team">
                            <Form.Group>
                                <Form.Label htmlFor="team-name" visuallyHidden>Team Name</Form.Label>
                                <InputGroup className='pb-2'>
                                    <InputGroup.Text>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/></svg>
                                    </InputGroup.Text>
                                    <Form.Control id="team-name" value={teamName} type="text" onChange={(e) => setTeamName(e.target.value)} placeholder='Team Name' maxLength={35} required/>
                                </InputGroup>
                                
                                {/* <Form.Label htmlFor="team-password" visuallyHidden>Password</Form.Label>
                                <InputGroup className="mb-3">
                                    <InputGroup.Text>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-lock" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"/></svg>
                                    </InputGroup.Text>
                                    <Form.Control id="team-password" value={guessedPassword} type="password" onChange={(e) => setGuessedPassword(e.target.value)} placeholder='Password' maxLength={50} required/>
                                </InputGroup> */}
                               
                                <Button type="submit" className='maxWidth'>Sign In</Button>
                            </Form.Group>
                        </Form>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default LoginPage;
