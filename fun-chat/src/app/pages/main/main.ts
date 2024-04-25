import {
  Message,
  MessageHistory,
  MessageSend,
  MessageRead,
  ResponseData,
} from '@/app/types/types';
import MessageContainerElement from '../../components/messageContainer';
import RequestTypes, { User, UsersResponse } from '../../types/requests';
import BaseComponentGenerator from '../../components/base-component';
import ButtonElement from '../../components/button';
import LogoutHandler from './logoutHandler';
import InputField from '../login-form/input-field';

export interface SessionObject {
  id: string;
  login: string;
  password: string;
}
export default class MainPage {
  private main: HTMLElement;

  private aboutBtn: ButtonElement;

  private logoutBtn: ButtonElement;

  private username: string = '';

  private inactiveUsers: User[];

  private activeUsers: User[];

  private userList: BaseComponentGenerator;

  private userContacts: BaseComponentGenerator;

  private userDialogue: BaseComponentGenerator;

  private userDialogueInputField: InputField;

  private userListSearch: InputField;

  private chosenUser: string;

  private isUserScrolling: boolean;

  private userDialogueInputButton: ButtonElement;

  private userDialogueContent: BaseComponentGenerator;

  socket: WebSocket;

  constructor(socket: WebSocket) {
    this.inactiveUsers = [];
    this.activeUsers = [];
    this.chosenUser = '';
    this.isUserScrolling = false;
    this.socket = socket;
    this.getUsername();
    const mainGen = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['main'],
    });
    const headerGen = new BaseComponentGenerator({
      tag: 'header',
      classNames: ['header'],
    });
    const usernameGen = new BaseComponentGenerator({
      tag: 'h2',
      classNames: ['username'],
      content: `User: ${this.username}`,
    });
    const titleGen = new BaseComponentGenerator({
      tag: 'h1',
      classNames: ['title'],
      content: 'Fun Chat',
    });
    this.aboutBtn = new ButtonElement(['aboutBtn'], 'About', {
      type: 'button',
    });
    this.logoutBtn = new ButtonElement(['logoutBtn'], 'Log Out', {
      type: 'button',
    });
    this.logoutBtn
      .getButton()
      .addEventListener('click', (event: Event) =>
        LogoutHandler(event, this.socket)
      );
    const chatWindowGen = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['chatwindow'],
    });
    this.userList = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['userlist'],
    });

    this.userListSearch = new InputField(['userlist_search'], 'text', () =>
      this.searchUser(this.userListSearch.getElement().value)
    );
    this.userListSearch.getElement().setAttribute('placeholder', 'Search:');
    this.userContacts = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['contacts'],
    });
    this.userDialogue = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['userdialogue'],
    });

    const userDialogueHeader = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['userdialogue_header'],
    });
    this.userDialogueContent = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['userdialogue_content'],
      content: 'Choose user to send a message',
    });
    this.userDialogueContent.getElement().addEventListener('click', () => {
      if (this.chosenUser) {
        this.getMessage(this.chosenUser);
      }
    });
    // this.userDialogueContent
    //   .getElement()
    //   .addEventListener('scroll', () => this.handleScroll());
    const userDialogueInput = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['userdialogue_input'],
    });
    this.userDialogueInputField = new InputField(
      ['userdialogue_input_field'],
      'text',
      () => this.unblockDialogueButton()
    );
    this.userDialogueInputField
      .getElement()
      .setAttribute('placeholder', 'Your message:');
    this.userDialogueInputField.getElement().disabled = !this.chosenUser;
    this.userDialogueInputButton = new ButtonElement(
      ['userdialogue_input_btn'],
      'Send',
      { disabled: 'true', type: 'button' }
    );
    this.userDialogueInputButton
      .getButton()
      .addEventListener('click', this.sendMessageHandler);

    window.addEventListener('keypress', (event) => {
      if (
        event.key === 'Enter' &&
        !this.userDialogueInputButton.getButton().disabled
      ) {
        this.sendMessage();
      }
    });
    userDialogueInput.appendChildren([
      this.userDialogueInputField.getElement(),
      this.userDialogueInputButton.getButton(),
    ]);
    this.userDialogue.appendChildren([
      userDialogueHeader,
      this.userDialogueContent,
      userDialogueInput,
    ]);
    const footerGen = new BaseComponentGenerator({
      tag: 'footer',
      classNames: ['footer'],
    });
    const rssLogoGen = new BaseComponentGenerator({
      tag: 'h3',
      classNames: ['rss-logo'],
      content: 'RSSchool',
    });
    const githubGen = new BaseComponentGenerator({
      tag: 'a',
      classNames: ['github'],
      content: 'Ksarise',
      attributes: { href: 'https://github.com/ksarise' },
    });
    const yearGen = new BaseComponentGenerator({
      tag: 'p',
      classNames: ['year'],
      content: '2024',
    });
    footerGen.appendChildren([rssLogoGen, githubGen, yearGen]);
    headerGen.appendChildren([
      usernameGen,
      titleGen,
      this.aboutBtn.getButton(),
      this.logoutBtn.getButton(),
    ]);
    this.userList.appendChildren([
      this.userListSearch.getElement(),
      this.userContacts,
    ]);
    chatWindowGen.appendChildren([this.userList, this.userDialogue]);
    mainGen.appendChildren([headerGen, chatWindowGen, footerGen]);

    this.main = mainGen.getElement() as HTMLElement;
  }

  private getUsername() {
    const data = sessionStorage.getItem('ksariseUser');
    if (data) {
      const sessionData = JSON.parse(data);
      this.username = sessionData.login;
    }
  }

  private searchUser(value: string) {
    const searchChar = value.toLowerCase();
    const items = this.userList
      .getElement()
      .querySelectorAll<HTMLDivElement>('.user');
    items.forEach((item) => {
      const text = item.textContent?.toLowerCase() || '';
      const displayStyle = text.includes(searchChar) ? 'block' : 'none';
      const searchItem = item;
      searchItem.style.display = displayStyle;
    });
  }

  private userRelogin() {
    const userData = sessionStorage.getItem('ksariseUser');
    if (userData) {
      const sessionData: SessionObject = JSON.parse(userData);
      console.log('session', sessionData.login, sessionData.password);
      // TODO typify it
      const authPayload = {
        user: {
          login: sessionData.login,
          password: sessionData.password,
        },
      };
      const message = {
        id: Math.random().toString(),
        type: RequestTypes.USER_LOGIN,
        payload: authPayload,
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  private setupWebSocket() {
    this.socket.addEventListener('open', () => {
      this.userRelogin();
    });
    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  public getUsers(requestType: RequestTypes) {
    const payload = null;
    if (
      (requestType === RequestTypes.USER_ACTIVE ||
        requestType === RequestTypes.USER_INACTIVE) &&
      this.socket.readyState === 1
    ) {
      this.socket.send(
        JSON.stringify({
          id: requestType,
          type: requestType,
          payload,
        })
      );
    }
  }

  private handleWebSocketMessage(
    data:
      | UsersResponse
      | MessageHistory
      | MessageSend
      | ResponseData
      | MessageRead
  ) {
    console.log('CATCH', data.type, data.payload);
    if ('users' in data.payload) {
      switch (data.type) {
        case RequestTypes.USER_ACTIVE:
          this.userContacts.getElement().innerHTML = '';
          this.activeUsers = data.payload.users;
          this.displayUsers(this.activeUsers, 'online');
          break;
        case RequestTypes.USER_INACTIVE:
          this.inactiveUsers = data.payload.users;
          this.displayUsers(this.inactiveUsers, 'offline');
          break;
        default:
          break;
      }
    } else if ('user' in data.payload) {
      if (
        data.type === RequestTypes.USER_EXTERNAL_LOGIN ||
        data.type === RequestTypes.USER_EXTERNAL_LOGOUT
      ) {
        this.userContacts.getElement().innerHTML = '';
        this.getUsers(RequestTypes.USER_ACTIVE);
        this.getUsers(RequestTypes.USER_INACTIVE);
      }
    } else if ('messages' in data.payload) {
      switch (data.type) {
        case RequestTypes.MSG_FROM_USER:
          this.displayMessages(data.payload.messages);

          if (this.username !== this.chosenUser) {
            this.readAllMessages(data.payload.messages);
          }

          break;
        default:
          break;
      }
    } else if ('message' in data.payload) {
      if (this.chosenUser) {
        if (data.type === RequestTypes.MSG_SEND) {
          this.getMessage(this.chosenUser);
        } else if (data.type === RequestTypes.MSG_READED_FROM_SERVER) {
          this.getMessage(this.chosenUser);
        } else if (data.type === RequestTypes.MSG_DELETE) {
          this.getMessage(this.chosenUser);
        } else if (data.type === RequestTypes.MSG_EDIT) {
          this.userDialogueInputButton
            .getButton()
            .addEventListener('click', this.sendMessageHandler);
          this.userDialogueInputButton.getButton().textContent = 'Send';
          this.getMessage(this.chosenUser);
        }
      }
    }
  }

  private displayUsers(allUsers: User[], status: string) {
    console.log('');
    allUsers.forEach((user) => {
      if (this.username !== user.login) {
        const userGen = new BaseComponentGenerator({
          tag: 'div',
          classNames: ['user', `${status}`],
          content: `${user.login}`,
        }).getElement();
        userGen.addEventListener('click', (e) => this.chooseUser(e));
        this.userContacts.appendElement(userGen);
      }
    });
  }

  private chooseUser(e: Event) {
    console.log(e.target);
    if (
      e.target &&
      e.target instanceof HTMLElement &&
      e.target.textContent !== null
    ) {
      this.chosenUser = e.target.textContent;
      this.isUserScrolling = false;
      this.userDialogue.getElement().children[0].textContent = `${this.chosenUser} ${e.target.classList[1]}`;
      this.userDialogueInputField.getElement().disabled = false;
      this.getMessage(this.chosenUser);
    }
  }

  private getMessage(targetUser: string) {
    this.socket.send(
      JSON.stringify({
        id: Math.random().toString(),
        type: RequestTypes.MSG_FROM_USER,
        payload: {
          user: {
            login: targetUser,
          },
        },
      })
    );
  }

  private sendMessage() {
    this.socket.send(
      JSON.stringify({
        id: Math.random().toString(),
        type: RequestTypes.MSG_SEND,
        payload: {
          message: {
            to: this.chosenUser,
            text: this.userDialogueInputField.getElement().value,
          },
        },
      })
    );
    this.userDialogueInputField.getElement().value = '';
    this.userDialogueInputButton.getButton().disabled = true;
    this.getMessage(this.chosenUser);
    console.log(this.isUserScrolling);
    // this.isUserScrolling = false;
    // if (this.isUserScrolling === false) {
    //   this.userDialogue.getElement().children[1].scrollTop =
    //     this.userDialogue.getElement().children[1].scrollHeight;
    // }
  }

  private handleScroll() {
    if (this.chosenUser !== this.username) {
      console.log(this.isUserScrolling);
      this.userDialogueContent
        .getElement()
        .removeEventListener('scroll', () => this.handleScroll());
      this.isUserScrolling = true;
      if (this.isUserScrolling === true) {
        this.getMessage(this.chosenUser);
      }
    }
  }

  private requestReadMessage(messageId: string) {
    this.socket.send(
      JSON.stringify({
        id: Math.random().toString(),
        type: RequestTypes.MSG_READED,
        payload: {
          message: {
            id: messageId,
          },
        },
      })
    );
  }

  private readAllMessages(messages: Message[]) {
    messages.forEach((message) => {
      if (!message.status.isReaded && message.to === this.username) {
        this.requestReadMessage(message.id);
      }
    });
  }

  private unblockDialogueButton() {
    this.userDialogueInputButton.getButton().disabled =
      this.userDialogueInputField.getElement().value.trim() === '';
  }

  private displayMessages(messages: Message[]) {
    if (messages.length > 0) {
      this.userDialogue.getElement().children[1].innerHTML = '';
      messages.forEach((message) => {
        this.displayMessage(message);
      });
      const unreadList = document.querySelectorAll('.unread');
      if (unreadList && unreadList.length > 0) {
        unreadList[0].classList.add('first-unread');
        console.log(this.isUserScrolling);
        if (!this.isUserScrolling) {
          unreadList[0].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    } else {
      this.userDialogue.getElement().children[1].innerHTML = '';
      this.userDialogue.getElement().children[1].textContent =
        'Our dialogue will be legendary!';
    }
  }

  private displayMessage(message: Message) {
    {
      const messageFromUser = new MessageContainerElement(message.id);
      if (message.from === this.username) {
        messageFromUser.getMessageContainer().classList.add('sent');
        messageFromUser
          .getMessageContainer()
          .addEventListener('contextmenu', (e) => this.selectMessage(e));
      }
      if (!message.status.isReaded && message.to === this.username) {
        messageFromUser.getMessageContainer().classList.add('unread');
      }
      const messageDate = new Date(message.datetime);
      const author = message.from === this.username ? 'Me' : message.from;
      messageFromUser.messageHeader.textContent = `${author} | ${messageDate.toDateString()}`;
      messageFromUser.messageText.textContent = message.text;
      messageFromUser.messageStatus.textContent = message.status.isReaded
        ? 'Readed'
        : 'Not Readed';
      this.userDialogue
        .getElement()
        .children[1].appendChild(messageFromUser.getMessageContainer());
    }
    if (!this.isUserScrolling) {
      this.userDialogue.getElement().children[1].scrollTop =
        this.userDialogue.getElement().children[1].scrollHeight;
    }
  }

  private selectMessage(e: Event) {
    e.preventDefault();
    const targetElement = e.target as HTMLElement;
    if (!targetElement) return;
    const contextMenu = new BaseComponentGenerator({
      tag: 'div',
      classNames: ['context-menu'],
    }).getElement();
    const contextMenuList = new BaseComponentGenerator({
      tag: 'ul',
      classNames: ['context-menu-list'],
    });
    const contextMenuListEdit = new BaseComponentGenerator({
      tag: 'li',
      classNames: ['context-menu-list-edit'],
      content: 'Edit',
    }).getElement();
    const contextMenuListDelete = new BaseComponentGenerator({
      tag: 'li',
      classNames: ['context-menu-list-delete'],
      content: 'Delete',
    }).getElement();

    let parentBlock = targetElement.closest('.messageContainer') as HTMLElement;
    if (parentBlock) {
      const rect = parentBlock.getBoundingClientRect();
      contextMenu.style.position = 'absolute';
      contextMenu.style.left = `${rect.left + 100}px`;
      contextMenu.style.top = `${rect.top - contextMenu.offsetHeight}px`;
    }
    const removeContextMenu = () => {
      document.removeEventListener('click', removeContextMenu);
      if (contextMenu && contextMenu.parentNode) {
        contextMenu.parentNode.removeChild(contextMenu);
      }
    };
    contextMenuListEdit.addEventListener('click', () => {
      const messageTextBlock = targetElement.closest(
        '.messageText'
      ) as HTMLElement;
      if (messageTextBlock && messageTextBlock.textContent) {
        this.editMessage(parentBlock, messageTextBlock.textContent);
      }
      removeContextMenu();
    });

    contextMenuListDelete.addEventListener('click', () => {
      parentBlock = targetElement.closest('.messageContainer') as HTMLElement;
      if (parentBlock) {
        this.deleteMessage(parentBlock);
      }
      removeContextMenu();
    });
    contextMenuList.appendChildren([
      contextMenuListEdit,
      contextMenuListDelete,
    ]);
    contextMenu.appendChild(contextMenuList.getElement());
    document.body.appendChild(contextMenu);

    document.addEventListener('click', removeContextMenu);
  }

  private deleteMessage(parentBlock: HTMLElement) {
    console.log(parentBlock.dataset.id);
    this.socket.send(
      JSON.stringify({
        id: Math.random().toString(),
        type: RequestTypes.MSG_DELETE,
        payload: {
          message: {
            id: parentBlock.dataset.id,
          },
        },
      })
    );
  }

  private requestEditMessage(parentBlock: HTMLElement, newText: string) {
    console.log(parentBlock.dataset.id);
    this.socket.send(
      JSON.stringify({
        id: Math.random().toString(),
        type: RequestTypes.MSG_EDIT,
        payload: {
          message: {
            id: parentBlock.dataset.id,
            text: newText,
          },
        },
      })
    );
  }

  private editMessage(messageTextBlock: HTMLElement, messageText: string) {
    this.userDialogueInputButton
      .getButton()
      .removeEventListener('click', this.sendMessageHandler);
    this.userDialogueInputField.getElement().value = messageText;
    this.userDialogueInputButton.getButton().disabled = false;
    this.userDialogueInputButton.getButton().textContent = 'Edit';
    this.userDialogueInputButton.getButton().addEventListener('click', () => {
      this.requestEditMessage(
        messageTextBlock,
        this.userDialogueInputField.getElement().value
      );
      this.userDialogueInputField.getElement().value = '';
      this.userDialogueInputButton.getButton().disabled = true;
    });
  }

  private sendMessageHandler = () => {
    this.sendMessage();
  };

  public initialize() {
    this.setupWebSocket();
    this.userContacts.getElement().innerHTML = '';
    this.getUsers(RequestTypes.USER_ACTIVE);
    this.getUsers(RequestTypes.USER_INACTIVE);
  }

  public getMain(): HTMLElement {
    return this.main;
  }
}
