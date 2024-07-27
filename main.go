package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func serveWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
	}
	defer conn.Close()

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}
		if msgType != websocket.TextMessage {
			log.Println("Wrong message type.")
			break
		}

		log.Printf("player messaage %s\n", msg)

		clientMsg := ClientMessage{}
		json.Unmarshal(msg, &clientMsg)

		time.Sleep(time.Second)

		switch clientMsg.Type {
		case ClientStartGame:
			err := conn.WriteJSON(newStartGameMessage(basicConfig))
			if err != nil {
				panic(err)
			}
			continue
		}
	}
}

func main() {
	fmt.Println("hello")

	static := http.Dir("dist")

	http.Handle("/", http.FileServer(static))
	http.HandleFunc("/ws", serveWS)

	http.ListenAndServe(":8000", nil)
}
