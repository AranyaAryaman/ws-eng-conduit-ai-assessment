import { Article } from '../article/article.entity'; // Import the Article entity
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { EntityManager, wrap, EntityRepository  } from '@mikro-orm/core';
import { SECRET } from '../config';
import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto';
import { User } from './user.entity';
import { IUserRO } from './user.interface';
import { UserRepository } from './user.repository';


@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: EntityRepository<User>,
    private readonly articleRepository: EntityRepository<Article>,
    private readonly em: EntityManager
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(loginUserDto: LoginUserDto): Promise<User> {
    const findOneOptions = {
      email: loginUserDto.email,
      password: crypto.createHmac('sha256', loginUserDto.password).digest('hex'),
    };

    return (await this.userRepository.findOne(findOneOptions))!;
  }

  async create(dto: CreateUserDto): Promise<IUserRO> {
    // check uniqueness of username/email
    const { username, email, password } = dto;
    const exists = await this.userRepository.count({ $or: [{ username }, { email }] });

    if (exists > 0) {
      throw new HttpException(
        {
          message: 'Input data validation failed',
          errors: { username: 'Username and email must be unique.' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // create new user
    const user = new User(username, email, password);
    const errors = await validate(user);

    if (errors.length > 0) {
      throw new HttpException(
        {
          message: 'Input data validation failed',
          errors: { username: 'Userinput is not valid.' },
        },
        HttpStatus.BAD_REQUEST,
      );
    } else {
      await this.em.persistAndFlush(user);
      return this.buildUserRO(user);
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne(id);
    wrap(user).assign(dto);
    await this.em.flush();

    return this.buildUserRO(user!);
  }

  async delete(email: string) {
    return this.userRepository.nativeDelete({ email });
  }

  async findById(id: number): Promise<IUserRO> {
    const user = await this.userRepository.findOne(id);

    if (!user) {
      const errors = { User: ' not found' };
      throw new HttpException({ errors }, 401);
    }

    return this.buildUserRO(user);
  }

  async findByEmail(email: string): Promise<IUserRO> {
    const user = await this.userRepository.findOneOrFail({ email });
    return this.buildUserRO(user);
  }

  generateJWT(user: User) {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign(
      {
        email: user.email,
        exp: exp.getTime() / 1000,
        id: user.id,
        username: user.username,
      },
      SECRET,
    );
  }

  private buildUserRO(user: User) {
    const userRO = {
      bio: user.bio,
      email: user.email,
      image: user.image,
      token: this.generateJWT(user),
      username: user.username,
    };

    return { user: userRO };
  }

  async getUserStats(userId: number): Promise<any> {
    // Fetch the user to ensure they exist
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Fetch all articles written by the user
    const articles = await this.em.find(Article, { author: user });

    // Sum the favoritesCount of all articles
    const favoriteCount = articles.reduce((sum, article) => sum + article.favoritesCount, 0);

    // Find the date of the first article
    const firstArticle = await this.em.findOne(Article, { author: user }, { orderBy: { createdAt: 'ASC' } });
    const firstArticleDate = firstArticle ? firstArticle.createdAt : null;

    // Return the stats
    return {
      username: user.username,
      articleCount: articles.length,
      favoriteCount,
      firstArticleDate: firstArticleDate ? firstArticleDate.toISOString() : null,
    };
  }

  async getUserRosterStats(): Promise<any[]> {
    // Retrieve all users with their article count and total favorites count using a single query
    const users = await this.em.find(User, {});

    const userStats = await Promise.all(users.map(async (user) => {
      // Get the total number of articles authored by the user
      const articleCount = await this.em.count(Article, { author: user });

      // Get the total number of favorites received on their articles
      const articles = await this.em.find(Article, { author: user });
      const favoriteCount = articles.reduce((sum, article) => sum + article.favoritesCount, 0);

      // Get the date of the first posted article
      const firstArticle = await this.em.findOne(Article, { author: user }, { orderBy: { createdAt: 'ASC' } });
      const firstArticleDate = firstArticle ? firstArticle.createdAt : null;

      return {
        username: user.username,
        profileLink: `/profiles/${user.username}`, // Assuming profile link follows this pattern
        articleCount,
        favoriteCount,
        firstArticleDate: firstArticleDate ? firstArticleDate.toISOString() : ''
      };
    }));

    // Sort the stats based on the number of favorites received
    userStats.sort((a, b) => b.favoriteCount - a.favoriteCount);

    return userStats;
  }

}
