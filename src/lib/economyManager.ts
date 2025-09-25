import * as fs from 'fs';
import * as path from 'path';

interface UserEconomyData {
  balance: number;
  bank: number;
  lastDaily: number;
  lastWeekly: number;
  totalEarned: number;
  totalSpent: number;
  level: number;
  xp: number;
}

interface EconomyData {
  [userId: string]: UserEconomyData;
}

const economyPath = path.join(__dirname, '../data/economy.json');

export class EconomyManager {
  private data: EconomyData = {};

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(economyPath)) {
        const rawData = fs.readFileSync(economyPath, 'utf-8');
        this.data = JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading economy data:', error);
      this.data = {};
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(economyPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving economy data:', error);
    }
  }

  private getUser(userId: string): UserEconomyData {
    if (!this.data[userId]) {
      this.data[userId] = {
        balance: 100, // Starting balance
        bank: 0,
        lastDaily: 0,
        lastWeekly: 0,
        totalEarned: 100,
        totalSpent: 0,
        level: 1,
        xp: 0
      };
      this.saveData();
    }
    return this.data[userId];
  }

  public getBalance(userId: string): { balance: number; bank: number; total: number } {
    const user = this.getUser(userId);
    return {
      balance: user.balance,
      bank: user.bank,
      total: user.balance + user.bank
    };
  }

  public addMoney(userId: string, amount: number, toBank = false): boolean {
    if (amount <= 0) return false;
    
    const user = this.getUser(userId);
    if (toBank) {
      user.bank += amount;
    } else {
      user.balance += amount;
    }
    user.totalEarned += amount;
    this.saveData();
    return true;
  }

  public removeMoney(userId: string, amount: number, fromBank = false): boolean {
    if (amount <= 0) return false;
    
    const user = this.getUser(userId);
    const currentAmount = fromBank ? user.bank : user.balance;
    
    if (currentAmount < amount) return false;
    
    if (fromBank) {
      user.bank -= amount;
    } else {
      user.balance -= amount;
    }
    user.totalSpent += amount;
    this.saveData();
    return true;
  }

  public transfer(fromUserId: string, toUserId: string, amount: number): boolean {
    if (amount <= 0) return false;
    
    const fromUser = this.getUser(fromUserId);
    if (fromUser.balance < amount) return false;
    
    this.removeMoney(fromUserId, amount);
    this.addMoney(toUserId, amount);
    return true;
  }

  public deposit(userId: string, amount: number): boolean {
    const user = this.getUser(userId);
    if (user.balance < amount) return false;
    
    user.balance -= amount;
    user.bank += amount;
    this.saveData();
    return true;
  }

  public withdraw(userId: string, amount: number): boolean {
    const user = this.getUser(userId);
    if (user.bank < amount) return false;
    
    user.bank -= amount;
    user.balance += amount;
    this.saveData();
    return true;
  }

  public canClaimDaily(userId: string): boolean {
    const user = this.getUser(userId);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return now - user.lastDaily >= oneDayMs;
  }

  public claimDaily(userId: string): number {
    if (!this.canClaimDaily(userId)) return 0;
    
    const amount = Math.floor(Math.random() * 500) + 250; // 250-750 coins
    const user = this.getUser(userId);
    user.lastDaily = Date.now();
    this.addMoney(userId, amount);
    return amount;
  }

  public canClaimWeekly(userId: string): boolean {
    const user = this.getUser(userId);
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return now - user.lastWeekly >= oneWeekMs;
  }

  public claimWeekly(userId: string): number {
    if (!this.canClaimWeekly(userId)) return 0;
    
    const amount = Math.floor(Math.random() * 2000) + 1000; // 1000-3000 coins
    const user = this.getUser(userId);
    user.lastWeekly = Date.now();
    this.addMoney(userId, amount);
    return amount;
  }

  public addXP(userId: string, amount: number): { levelUp: boolean; newLevel: number } {
    const user = this.getUser(userId);
    const oldLevel = user.level;
    user.xp += amount;
    
    // Calculate new level (100 XP per level, exponential growth)
    const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    user.level = newLevel;
    
    this.saveData();
    return { levelUp: newLevel > oldLevel, newLevel };
  }

  public getLevel(userId: string): { level: number; xp: number; xpForNext: number } {
    const user = this.getUser(userId);
    const xpForNext = Math.pow(user.level, 2) * 100 - user.xp;
    return {
      level: user.level,
      xp: user.xp,
      xpForNext: Math.max(0, xpForNext)
    };
  }

  public getStats(userId: string): UserEconomyData {
    return this.getUser(userId);
  }

  public getLeaderboard(type: 'balance' | 'level' | 'total', limit = 10): Array<{ userId: string; value: number }> {
    const users = Object.entries(this.data);
    
    let sortedUsers;
    switch (type) {
      case 'balance':
        sortedUsers = users.sort(([, a], [, b]) => (b.balance + b.bank) - (a.balance + a.bank));
        break;
      case 'level':
        sortedUsers = users.sort(([, a], [, b]) => b.level - a.level);
        break;
      case 'total':
        sortedUsers = users.sort(([, a], [, b]) => b.totalEarned - a.totalEarned);
        break;
    }
    
    return sortedUsers.slice(0, limit).map(([userId, userData]) => ({
      userId,
      value: type === 'balance' ? userData.balance + userData.bank : 
             type === 'level' ? userData.level : userData.totalEarned
    }));
  }
}

export const economyManager = new EconomyManager();