import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '~/common/filters/all-exceptions.filter';
import { GlobalValidationPipe } from '~/common/pipes/global-validation.pipe';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  app.use(cookieParser());
  app.useGlobalPipes(GlobalValidationPipe);
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Lost and Found API')
    .setDescription('API for managing lost and found items')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const apiPrefix = process.env.NODE_ENV === 'production' ? '' : 'api';
  app.setGlobalPrefix(apiPrefix);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log('http://localhost:' + port);
}
bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
