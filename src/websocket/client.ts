import { io } from "../http";
import { ConnectionsService } from "../services/ConnectionsService";
import { MessagesService } from "../services/MessagesService";
import { UsersService } from "../services/UsersService";

interface IParams {
  text: string;
  email: string;
}

io.on("connect", (socket) => {
  const connectionService = new ConnectionsService();
  const usersService = new UsersService();
  const messagesService = new MessagesService();

  socket.on("client_first_access", async (params) => {
    const socket_id = socket.id;
    const { text, email } = params as IParams;

    const userExists = await usersService.create(email);

    const connection = await connectionService.findByUser(userExists.id);

    if (!connection) {
      await connectionService.create({
        socket_id,
        user_id: userExists.id,
      });
    } else {
      connection.socket_id = socket_id;
      await connectionService.create(connection);
    }

    await messagesService.create({ text, user_id: userExists.id });

    const allMessages = await messagesService.listByUser(userExists.id);
    socket.emit("client_list_all_messages", allMessages);

    const allUsers = await connectionService.findAllWithoutAdmin();
    io.emit("admin_list_all_users", allUsers);
  });

  socket.on("client_send_to_admin", async (params) => {
    const { text, socket_admin_id } = params;

    const socket_id = socket.id;

    const { user_id } = await connectionService.findBySocketId(socket_id);

    const message = await messagesService.create({
      text,
      user_id,
    });

    io.to(socket_admin_id).emit("admin_receive_message", {
      message,
      socket_id,
    });
  });
});
